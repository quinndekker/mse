import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PredictionService } from '../../services/prediction/prediction.service';
import { FormsModule } from '@angular/forms';
import { InfoComponent } from '../info/info.component';

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

  definitions = {
    ticker: "The stock ticker symbol (e.g., AAPL for Apple, MSFT for Microsoft). This tells the model which stock you're interested in predicting.",
    modelType: "The type of machine learning model used for the prediction:\n- LSTM: Good for learning long-term patterns\n- GRU: Faster to train, handles short-term trends well\n- RNN: A simpler, more general-purpose model",
    predictionTimeline: "The time frame for the prediction:\n- 1 Day: Predicts the price for the next trading day\n- 2 Weeks: Predicts the price two weeks from now\n- 2 Months: Predicts the price two months into the future",
    predictedPrice: "The forecasted future price of the stock, based on the model and timeline you selected. For example, if you selected 'AAPL', 'LSTM', and '2 Weeks', this is what the model thinks AAPL will be worth two weeks from now.",
    status: "The state of the prediction request:\n- Completed: The model has finished processing\n- Pending: Still running (or failed silently)",
    startDate: "The date on which the prediction was requested and the input data was pulled. For example, a Monday morning prediction uses data from that date.",
    endDate: "The future date corresponding to the selected timeline. For instance, a 2-week prediction from August 1st will show an end date around August 15th.",
    priceDifference: "The difference between the actual price at the end date and the model's predicted price. Useful to assess how close the model was.",
    predictionAccuracy: "A score or percentage that shows how accurate the prediction was, calculated based on the real price vs predicted price after the time period passed."
  };
  

  constructor(private predictionService: PredictionService) {}

  ngOnInit(): void {
    this.predictionService.getUserPredictions().subscribe({
      next: (predictions) => {
        console.log('✅ User predictions:', predictions);
        this.predictions = predictions;
      }
      , error: (error) => {
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
}
