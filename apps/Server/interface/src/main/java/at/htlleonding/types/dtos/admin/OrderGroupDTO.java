package at.htlleonding.types.dtos.admin;

import java.util.List;

public record OrderGroupDTO(
        String groupKey,
        String groupLabel,
        List<OrderDetailDTO> orders
        ) {

}
