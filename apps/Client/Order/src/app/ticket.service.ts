import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, of, catchError } from 'rxjs';
import { KeycloakService } from 'keycloak-angular';
import { environment } from '../environments/environment';
import { isE2EMode } from './e2e-mode';

@Injectable({
  providedIn: 'root',
})
export class TicketService {
  URI: string = '';

  constructor(
    private httpClient: HttpClient,
    private keycloakService: KeycloakService
  ) {
    this.URI = `${environment.API_URL}/v2/ticket/`;
  }

  // Leo will know what to do
  /*
  async getAllRooms() {
    return await firstValueFrom<Room[]>(this.httpClient.get<Room[]>(this.URI + "/rooms"))
  }

  async getAllTablesFromRoom(id: string) {
    console.log("fetching to " + this.URI + "room/" + id + "/tables");
    return await firstValueFrom<Table[]>(this.httpClient.get<Table[]>(this.URI + "room/" + id + "/tables"))
  }

  async getBookedTickets() {
    return await firstValueFrom<number>(this.httpClient.get<number>(this.URI + "count"))
  }

  async sendTableSelection(roomid: string, tableid: string) {
    return await firstValueFrom(this.httpClient.post(this.URI + "room/" + roomid + "/selectedtable/", tableid))
  }
  */

  async getMaxTicketCount() {
    if (isE2EMode()) {
      return 1700;
    }
    return await firstValueFrom<number>(
      this.httpClient.get<number>(this.URI + 'count')
    );
  }

  async getStudentTicketPrice() {
    if (isE2EMode()) {
      return 25;
    }
    return await firstValueFrom<number>(
      this.httpClient.get<number>(this.URI + 'student')
    );
  }

  async getExternalTicketPrice() {
    if (isE2EMode()) {
      return 35;
    }
    return await firstValueFrom<number>(
      this.httpClient.get<number>(this.URI + 'extern')
    );
  }

  async getAllowanceOfTicket() {
    if (isE2EMode()) {
      return localStorage.getItem('__e2e_student_allowed') === 'true';
    }
    try {
      return await firstValueFrom(
        this.httpClient.get<boolean>(this.URI + 'student/allowed').pipe(
          catchError((error: HttpErrorResponse) => {
            console.log('Student ticket allowance check failed:', error.status);
            return of(false);
          })
        )
      );
    } catch (error) {
      console.error('Error in getAllowanceOfTicket:', error);
      return false;
    }
  }

  async getAllowanceOfGraduateTicket() {
    if (isE2EMode()) {
      return false;
    }
    try {
      return await firstValueFrom(
        this.httpClient.get<boolean>(this.URI + 'graduate/allowed').pipe(
          catchError((error: HttpErrorResponse) => {
            console.log(
              'Graduate ticket allowance check failed:',
              error.status
            );
            return of(false);
          })
        )
      );
    } catch (error) {
      console.error('Error in getAllowanceOfGraduateTicket:', error);
      return false;
    }
  }

  async getAdditionalChargeForPhysicalTicket() {
    if (isE2EMode()) {
      return 3;
    }
    const res = await firstValueFrom(
      this.httpClient.get<{ additionalChargeForPhysicalTicket: number }>(
        this.URI + 'physical/additional-charge'
      )
    );
    return res.additionalChargeForPhysicalTicket;
  }

  async getMaxTicketCountPerOrder() {
    if (isE2EMode()) {
      return 25;
    }
    return await firstValueFrom<number>(
      this.httpClient.get<number>(this.URI + 'count-per-order')
    );
  }
}
