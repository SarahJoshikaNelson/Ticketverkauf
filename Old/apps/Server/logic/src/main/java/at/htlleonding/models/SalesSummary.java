package at.htlleonding.models;

public record SalesSummary(
        double studentProfit,
        double externalProfit,
        int studentTickets,
        int externalTickets,
        int freeTickets,
        double tableProfit,
        double[] pastWeekProfit,
        long[] pastWeekOrderCount,
        long orderCount,
        long tableCount,
        double[] pastWeekExternalProfit,
        double[] pastWeekStudentProfit,
        double[] pastWeekTableProfit,
        int[] pastWeekPhysicalTickets,
        long physicalStudentTickets,
        long physicalExternalTickets
) {
}