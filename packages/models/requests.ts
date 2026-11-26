import { Customer } from "./order";


type Table = {
    name: string;
    price: number
    room: string;
    xposition: number;
    yposition: number;
    xlength: number;
    ylength: number;
    selectable: boolean;
    seats: Seat[];
}

type Seat = {
    id: string;
    taken: boolean;
    xposition: number;
    yposition: number;
    xlength: number;
    ylength: number;
}

type Room = {
    name: string;
    tables: Table[];
    xposition: number;
    yposition: number;
    xlength: number;
    ylength: number;
}

type OrderRequest = {
    customer: Customer
    tickets: ('STUDENT' | 'EXTERNAL' | 'GRADUATE')[]
    seats?: Seat[] | null
    token?: string | null
}

type SocketTicketCount = {
    count: number;  
}

export type { Table, Room, OrderRequest, SocketTicketCount, Seat };