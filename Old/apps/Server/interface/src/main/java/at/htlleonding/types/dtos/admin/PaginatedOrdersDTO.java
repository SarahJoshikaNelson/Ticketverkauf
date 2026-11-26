package at.htlleonding.types.dtos.admin;

import java.util.List;

public record PaginatedOrdersDTO(
        List<OrderDetailDTO> orders,
        long totalCount
        ) {

}
