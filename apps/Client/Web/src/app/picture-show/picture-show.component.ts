import {Component, Input, signal} from '@angular/core';
import {PictureFrameComponent} from '../picture-frame/picture-frame.component';
import { DataProviderService } from '../data-provider.service';

@Component({
  selector: 'app-picture-show',
  standalone: true,
  imports: [
    PictureFrameComponent
  ],
  templateUrl: './picture-show.component.html',
  styleUrl: './picture-show.component.css'
})
export class PictureShowComponent {
  @Input()
  color: string = 'violet';

  images = signal<string[]>([]);
  maturaballYear = signal<number>(new Date().getFullYear() - 1);

  constructor(private dataProviderService: DataProviderService) { }

  async ngOnInit() {
    this.images.set(this.dataProviderService.getImagesLocal() || []);

    const localDate = this.dataProviderService.getDateLocal();
    if (localDate) {
      this.maturaballYear.set(localDate.getFullYear());
    }

    await this.saveDatas();
  }

  async saveDatas() {
    this.images.set(await this.dataProviderService.getImages());
    this.dataProviderService.saveImagesLocal(this.images());

    const date = await this.dataProviderService.getDate();
    if (date && !isNaN(date.getTime())) {
      this.maturaballYear.set(date.getFullYear() - 1);
    }
  }
}
