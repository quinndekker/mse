import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatButtonModule} from '@angular/material/button';

@Component({
  selector: 'app-info',
  imports: [
    CommonModule,
    MatTooltipModule,
    MatButtonModule
  ],
  templateUrl: './info.component.html',
  styleUrl: './info.component.css'
})
export class InfoComponent {
  @Input() text: string = 'Information not available';

  infoBlack: string = '../app/assets/info-black.png';
  infoWhite: string = '../app/assets/info-white.png';
  imageSrc: string = this.infoBlack;

  onMouseOver() {
    this.imageSrc = this.infoWhite;
  }

  onMouseOut() {
    this.imageSrc = this.infoBlack;
  }

}
