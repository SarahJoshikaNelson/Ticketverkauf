package at.htlleonding.extensions;

import io.quarkus.qute.TemplateExtension;
import lombok.experimental.UtilityClass;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import java.util.Locale;

@TemplateExtension
@UtilityClass
public class DateExtension {
    public static String formatDate(LocalDate date) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("d. MMMM yyyy", Locale.GERMAN);
        return date.format(formatter);
    }

    public static String formatDateTime(LocalDateTime dateTime) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("d. MMMM yyyy, HH:mm 'Uhr'", Locale.GERMAN);
        return dateTime.format(formatter);
    }

    public static String formatDate(Date date) {
        if (date == null) {
            return "";
        }
        LocalDate localDate = date.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
        return formatDate(localDate);
    }
}