package at.htlleonding.exceptions;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class MissingDataException extends RuntimeException {
    public final MissingData missingDataType;

    public MissingDataException(MissingData missingDataType, Throwable cause) {
        super(cause);
        this.missingDataType = missingDataType;
    }

    public MissingDataException(MissingData missingDataType, String message, Throwable cause) {
        super(message, cause);
        this.missingDataType = missingDataType;
    }
}