import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PredictionService } from '../../services/prediction/prediction.service';
import { FormsModule } from '@angular/forms';
import { InfoComponent } from '../info/info.component';
import { ActivatedRoute } from '@angular/router';
import { switchMap, tap, map } from 'rxjs/operators';
import { Router } from '@angular/router';

@Component({
  selector: 'app-predictions',
  imports: [
    CommonModule,
    FormsModule,
    InfoComponent
  ],
  templateUrl: './predictions.component.html',
  styleUrl: './predictions.component.css'
})
export class PredictionsComponent {
  ticker: string = '';
  modelType: string = 'lstm';
  predictionTimeline: string = '1d';

  result: any = null;
  predictions: any[] = [];

  searchTicker: string = '';

  definitions = {
    ticker: "The stock ticker symbol (e.g., AAPL for Apple, MSFT for Microsoft). This tells the model which stock you're interested in predicting.",
    modelType: "The type of machine learning model used for the prediction:\n- LSTM: Good for learning long-term patterns\n- GRU: Faster to train, handles short-term trends well\n- RNN: A simpler, more general-purpose model",
    predictionTimeline: "The time frame for the prediction:\n- 1 Day: Predicts the price for the next trading day\n- 2 Weeks: Predicts the price two weeks from now\n- 2 Months: Predicts the price two months into the future",
    predictedPrice: "The forecasted future price of the stock, based on the model and timeline you selected. For example, if you selected 'AAPL', 'LSTM', and '2 Weeks', this is what the model thinks AAPL will be worth two weeks from now.",
    status: "The state of the prediction request:\n- Completed: The model has finished processing\n- Pending: Still running (or failed silently)",
    startDate: "The date on which the prediction was requested and the input data was pulled. For example, a Monday morning prediction uses data from that date.",
    endDate: "The future date corresponding to the selected timeline. For instance, a 2-week prediction from August 1st will show an end date around August 15th.",
    priceDifference: "The difference between the actual price at the end date and the model's predicted price. Useful to assess how close the model was.",
    predictionAccuracy: "A score or percentage that shows how accurate the prediction was, calculated based on the real price vs predicted price after the time period passed.",
    actualPrice: "The real market opening price on the end date (first trade of that session), fetched from Alpha Vantage once the end date has passed. This value is used to evaluate the model’s prediction. Before the end date, it will show as Pending.",
    insuffientData: "Indicates whether the model had enough historical data to make a prediction. If true, it means the model could not find enough data points to generate a reliable forecast."
  };
  

  constructor(
    private predictionService: PredictionService,
    private activatedRoute: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Load (and react to) the optional :ticker route param
    this.activatedRoute.paramMap
      .pipe(
        map(pm => (pm.get('ticker') || '').trim()),
        tap(t => {
          this.ticker = t ? t.toUpperCase() : '';
          this.searchTicker = this.ticker; // reflect param in the search box
        }),
        switchMap(t =>
          this.predictionService.getUserPredictions(t || undefined)
        )
      )
      .subscribe({
        next: (predictions) => {
          console.log('✅ User predictions:', predictions);
          this.predictions = predictions;
        },
        error: (error) => {
          console.error('❌ Error fetching user predictions:', error);
          this.predictions = [];
        }
      });
  }


  submitPrediction() {
    this.predictionService.createPrediction(this.ticker, this.modelType, this.predictionTimeline).subscribe({
      next: (response) => {
        console.log('✅ Prediction success:', response);
        this.result = response;
      },
      error: (error) => {
        console.error('❌ Prediction error:', error);
        this.result = null;
      }
    });
  }

  onSearchSubmit(e: Event) {
    e.preventDefault();
    const t = (this.searchTicker || '').trim();
    if (t) {
      this.router.navigate(['/predictions', t.toUpperCase()]);
    } else {
      this.router.navigate(['/predictions']);
    }
  }

  clearFilter() {
    this.searchTicker = '';
    this.router.navigate(['/predictions']);
  }

  navigateToStock(ticker: string) {
    if (ticker) {
      this.router.navigate(['/stock', ticker.toUpperCase()]);
    } else {
      console.error('Ticker is not defined, cannot navigate to stock.');
    }
  }
}
