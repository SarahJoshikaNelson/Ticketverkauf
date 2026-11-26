export type SalesOverview = {
    studentProfit: number;
    externalProfit: number;
    studentTickets: number;
    externalTickets: number;
    freeTickets: number;
    tableProfit: number;
    pastWeekProfit: number[];
    pastWeekOrderCount: number[];
    orderCount: number;
    tableCount: number;
    pastWeekExternalProfit: number[];
    pastWeekStudentProfit: number[];
    pastWeekTableProfit: number[];
    pastWeekPhysicalTickets: number[];
    physicalStudentTickets: number;
    physicalExternalTickets: number;
}