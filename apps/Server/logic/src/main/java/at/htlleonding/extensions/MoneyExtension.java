package at.htlleonding.extensions;

import io.quarkus.qute.TemplateExtension;
import lombok.experimental.UtilityClass;

import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.Locale;

@TemplateExtension
@UtilityClass
public class MoneyExtension {
    public static String formatMoney(double amount) {
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.GERMAN);
        symbols.setDecimalSeparator(',');
        symbols.setGroupingSeparator('.');
        
        DecimalFormat df = new DecimalFormat("€ #,##0.00", symbols);
        return df.format(amount);
    }
    
    public static String formatMoney(Double amount) {
        if (amount == null) {
            return "€ 0,00";
        }
        return formatMoney(amount.doubleValue());
    }
}
