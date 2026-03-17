package com.financebot.apiserver.domain.news;

import com.financebot.apiserver.common.exception.BusinessException;
import com.financebot.apiserver.domain.news.dto.NewsCreateRequest;
import com.financebot.apiserver.domain.news.dto.NewsResponse;
import com.financebot.apiserver.domain.news.entity.NewsArticle;
import com.financebot.apiserver.domain.news.entity.NewsSummary;
import com.financebot.apiserver.domain.news.repository.NewsArticleRepository;
import com.financebot.apiserver.domain.news.repository.NewsSummaryRepository;
import com.financebot.apiserver.domain.news.service.NewsService;
import com.financebot.apiserver.domain.stock.entity.Stock;
import com.financebot.apiserver.domain.stock.repository.StockRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("NewsService 단위 테스트")
class NewsServiceTest {

  @InjectMocks
  private NewsService newsService;

  @Mock
  private NewsArticleRepository newsArticleRepository;

  @Mock
  private NewsSummaryRepository newsSummaryRepository;

  @Mock
  private StockRepository stockRepository;

  private NewsCreateRequest validRequest;
  private Stock sampleStock;

  @BeforeEach
  void setUp() {
    sampleStock = Stock.builder()
        .ticker("005930")
        .name("삼성전자")
        .sector("반도체")
        .exchange("KOSPI")
        .build();

    validRequest = new NewsCreateRequest(
        new NewsCreateRequest.ArticleData(
            "삼성전자 HBM3E 양산 소식",
            "https://news.example.com/samsung-hbm3e",
            "HBM3E 양산 본격화로 2분기 실적 개선 기대.",
            "AUTO",
            null
        ),
        new NewsCreateRequest.SummaryData(
            1L,
            "삼성전자가 HBM3E 메모리 양산을 시작했습니다.",
            "실적",
            "POSITIVE",
            List.of("HBM3E", "삼성전자", "반도체")
        )
    );
  }

  @Test
  @DisplayName("뉴스 등록 - 성공")
  void createNews_success() {
    // given
    given(newsArticleRepository.existsByUrl(any())).willReturn(false);
    given(newsArticleRepository.save(any(NewsArticle.class))).willAnswer(inv -> inv.getArgument(0));
    given(stockRepository.findById(1L)).willReturn(Optional.of(sampleStock));
    given(newsSummaryRepository.save(any(NewsSummary.class))).willAnswer(inv -> inv.getArgument(0));

    // when
    NewsResponse result = newsService.createNews(validRequest);

    // then
    assertThat(result.title()).isEqualTo("삼성전자 HBM3E 양산 소식");
    assertThat(result.sourceType()).isEqualTo("AUTO");
    assertThat(result.sentiment()).isEqualTo("POSITIVE");
    assertThat(result.category()).isEqualTo("실적");
    assertThat(result.keywords()).containsExactly("HBM3E", "삼성전자", "반도체");
    assertThat(result.stockTicker()).isEqualTo("005930");
  }

  @Test
  @DisplayName("뉴스 등록 - 중복 URL 시 409 Conflict")
  void createNews_duplicateUrl_throwsConflict() {
    // given
    given(newsArticleRepository.existsByUrl("https://news.example.com/samsung-hbm3e"))
        .willReturn(true);

    // when & then
    assertThatThrownBy(() -> newsService.createNews(validRequest))
        .isInstanceOf(BusinessException.class)
        .satisfies(e -> assertThat(((BusinessException) e).getStatus())
            .isEqualTo(HttpStatus.CONFLICT));
  }

  @Test
  @DisplayName("뉴스 등록 - stockId 없어도 뉴스는 정상 저장")
  void createNews_withoutStockId_success() {
    // given
    NewsCreateRequest noStockRequest = new NewsCreateRequest(
        new NewsCreateRequest.ArticleData(
            "글로벌 경제 뉴스",
            "https://news.example.com/global",
            null,
            "MANUAL",
            null
        ),
        new NewsCreateRequest.SummaryData(
            null, // stockId 없음
            "글로벌 금리 인상 가능성 제기",
            "규제",
            "NEUTRAL",
            null
        )
    );
    given(newsArticleRepository.existsByUrl(any())).willReturn(false);
    given(newsArticleRepository.save(any(NewsArticle.class))).willAnswer(inv -> inv.getArgument(0));
    given(newsSummaryRepository.save(any(NewsSummary.class))).willAnswer(inv -> inv.getArgument(0));

    // when
    NewsResponse result = newsService.createNews(noStockRequest);

    // then
    assertThat(result.stockId()).isNull();
    assertThat(result.stockName()).isNull();
    assertThat(result.sentiment()).isEqualTo("NEUTRAL");
    // stockRepository는 호출되지 않아야 함
    then(stockRepository).should(never()).findById(any());
  }

  @Test
  @DisplayName("뉴스 단건 조회 - 성공")
  void getNews_success() {
    // given
    NewsArticle article = NewsArticle.builder()
        .title("테스트 뉴스")
        .url("https://example.com/test")
        .sourceType(NewsArticle.SourceType.AUTO)
        .build();
    NewsSummary summary = NewsSummary.builder()
        .article(article)
        .stock(sampleStock)
        .summary("테스트 요약")
        .category("실적")
        .sentiment(NewsSummary.Sentiment.POSITIVE)
        .keywords(List.of("테스트"))
        .build();

    given(newsArticleRepository.findById(1L)).willReturn(Optional.of(article));
    given(newsSummaryRepository.findByArticle(article)).willReturn(Optional.of(summary));

    // when
    NewsResponse result = newsService.getNews(1L);

    // then
    assertThat(result.title()).isEqualTo("테스트 뉴스");
    assertThat(result.summary()).isEqualTo("테스트 요약");
  }

  @Test
  @DisplayName("뉴스 단건 조회 - 존재하지 않는 ID 시 404 반환")
  void getNews_notFound_throwsNotFound() {
    // given
    given(newsArticleRepository.findById(999L)).willReturn(Optional.empty());

    // when & then
    assertThatThrownBy(() -> newsService.getNews(999L))
        .isInstanceOf(BusinessException.class)
        .satisfies(e -> assertThat(((BusinessException) e).getStatus())
            .isEqualTo(HttpStatus.NOT_FOUND));
  }
}
