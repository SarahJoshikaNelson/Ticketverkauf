import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ImpressumComponent } from './impressum/impressum.component';
import { DatenschutzComponent } from './datenschutz/datenschutz.component';
import {OrdersListComponent} from './orders-list/orders-list.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    data: { color: 'violet' }
  },  
  {
    path: 'impressum',
    component: ImpressumComponent
  },
  {
    path: 'datenschutz',
    component: DatenschutzComponent
  },
  {
    path: 'orders',
    component: OrdersListComponent
  },
];
