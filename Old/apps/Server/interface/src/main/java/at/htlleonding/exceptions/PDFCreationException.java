package at.htlleonding.exceptions;

public class PDFCreationException extends RuntimeException {
    public PDFCreationException() {
        super("PDF could not be created properly.");
    }
    
    public PDFCreationException(String message) {
        super(message);
    }
    
    public PDFCreationException(String message, Throwable cause) {
        super(message, cause);
    }
    
    public PDFCreationException(Throwable cause) {
        super("PDF could not be created properly.", cause);
    }
}
