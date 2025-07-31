import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';


@Component({
  selector: 'app-sectors',
  imports: [
    CommonModule,
    MatCardModule
  ],
  templateUrl: './sectors.component.html',
  styleUrl: './sectors.component.css'
})
export class SectorsComponent {
  sectors = [
    {
      name: 'Technology',
      description: 'Includes companies focused on software, hardware, and IT services. Example: Apple, Microsoft.'
    },
    {
      name: 'Health Care',
      description: 'Covers pharmaceuticals, biotechnology, and medical devices. Example: Pfizer, Johnson & Johnson.'
    },
    {
      name: 'Financials',
      description: 'Includes banks, insurance, and financial services. Example: JPMorgan Chase, Goldman Sachs.'
    },
    {
      name: 'Energy',
      description: 'Comprises oil, gas, and renewable energy companies. Example: ExxonMobil, Chevron.'
    },
    {
      name: 'Consumer Discretionary',
      description: 'Goods and services considered non-essential. Example: Amazon, Nike.'
    },
    {
      name: 'Consumer Staples',
      description: 'Products used daily—like food, beverages, and hygiene. Example: Coca-Cola, Procter & Gamble.'
    },
    {
      name: 'Industrials',
      description: 'Includes aerospace, defense, and construction. Example: Boeing, Caterpillar.'
    },
    {
      name: 'Utilities',
      description: 'Electric, gas, and water companies. Example: Duke Energy, NextEra Energy.'
    },
    {
      name: 'Real Estate',
      description: 'REITs and real estate management firms. Example: American Tower, Prologis.'
    },
    {
      name: 'Materials',
      description: 'Raw materials and natural resource companies. Example: Dow, DuPont.'
    },
    {
      name: 'Communication Services',
      description: 'Telecom and media firms. Example: Verizon, Meta.'
    }
  ];
}
