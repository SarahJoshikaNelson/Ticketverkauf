package at.htlleonding.types.dtos.admin;

import java.util.List;

public record GroupedOrdersDTO(
        List<OrderGroupDTO> groups,
        long totalCount
        ) {

}
