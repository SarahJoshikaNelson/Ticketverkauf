package at.htlleonding;

import at.htlleonding.types.dtos.BankProcessDTO;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.json.Json;
import jakarta.json.JsonObject;
import jakarta.json.JsonReader;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;

import java.io.IOException;
import java.io.StringReader;
import java.nio.file.Files;

@ApplicationScoped
@AllArgsConstructor(onConstructor_ = {@Inject})
@NoArgsConstructor
public class BankProcessManager {
    private AiManager aiManager;

    /**
     * Process an uploaded bank statement PDF and extract structured transaction data.
     *
     * @param dto the uploaded PDF file info
     * @return JSON string with extracted bank statement data
     */
    public String processBankStatement(BankProcessDTO dto) {
        String pdfText = extractTextFromPdf(dto);
        String prompt = buildExtractionPrompt(pdfText);
        String aiResponse = aiManager.callApi(prompt, aiManager.getModel());
        return extractJsonContent(aiResponse);
    }

    /**
     * Extract text content from the uploaded PDF file.
     */
    private String extractTextFromPdf(BankProcessDTO dto) {
        try (PDDocument document = PDDocument.load(Files.newInputStream(dto.filePath()))) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        } catch (IOException e) {
            throw new RuntimeException("Failed to extract text from PDF: " + dto.fileName(), e);
        }
    }

    /**
     * Build the AI prompt for extracting structured data from bank statement text.
     */
    private String buildExtractionPrompt(String text) {
        return """
            You are an expert financial data extraction assistant.
            Extract structured information from bank statement text and return as valid JSON.

            CRITICAL REQUIREMENTS:
            1. Extract ALL transactions found in the statement
            2. Use YYYY-MM-DD format for all dates
            3. For amounts: use positive numbers for both debits and credits
            4. For credits (incoming payments): Extract the SENDER'S LAST NAME from the description
            5. Return ONLY valid JSON, no markdown formatting, no code blocks

            IMPORTANT FOR SENDER NAME EXTRACTION:
            - For incoming payments (credits), identify the person who sent the money
            - Extract ONLY their LAST NAME (family name/surname)
            - Look for patterns like "VON [FirstName] [LastName]", "[LastName] [FirstName]", or just names in the description
            - If multiple names appear, choose the one that is most likely the sender
            - If no sender name can be identified, set sender_last_name to null

            JSON STRUCTURE REQUIRED:
            {
                "account_holder_name": "Full name of account holder",
                "bank_name": "Bank name",
                "account_number": "Account number or IBAN",
                "sort_code": "Sort code/BLZ if available, otherwise null",
                "statement_period": "Statement period",
                "transactions": [
                    {
                        "date": "YYYY-MM-DD",
                        "description": "Full transaction description",
                        "sender_last_name": "Last name of sender for credits, null for debits or if unknown",
                        "debit": 123.45 or null,
                        "credit": 67.89 or null,
                        "balance": 1234.56 or null,
                        "reference": "Reference number or null"
                    }
                ]
            }

            Here is the bank statement text to process:
            ---
            %s
            ---

            Return only the JSON response:
            """.formatted(text);
    }

    /**
     * Extract the actual JSON content from the OpenRouter API response.
     */
    private String extractJsonContent(String aiResponse) {
        try (JsonReader reader = Json.createReader(new StringReader(aiResponse))) {
            JsonObject response = reader.readObject();
            return response
                    .getJsonArray("choices")
                    .getJsonObject(0)
                    .getJsonObject("message")
                    .getString("content");
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse AI response", e);
        }
    }
}
