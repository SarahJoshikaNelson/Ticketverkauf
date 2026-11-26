package at.htlleonding;

import at.htlleonding.repositories.GraduateRepo;
import at.htlleonding.repositories.MaturantRepo;
import at.htlleonding.types.Maturant;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.BufferedReader;
import java.io.StringReader;
import java.util.ArrayList;
import java.util.List;

@ApplicationScoped
@AllArgsConstructor(onConstructor_ = {@Inject})
@NoArgsConstructor
public class StudentManager {
    private static final Logger log = LoggerFactory.getLogger(StudentManager.class);
    
    private GraduateRepo graduateRepo;
    private MaturantRepo maturantRepo;

    public boolean isGraduate(String id) {
        // Check if user exists in Maturant table (primary source)
        Maturant maturant = maturantRepo.findById(id.toUpperCase());
        if (maturant != null) {
            return true;
        }
        
        // Fallback to Graduate table for backwards compatibility
        return graduateRepo.findById(id) != null;
    }

    @Transactional
    public boolean createMaturant(Maturant maturant) {
        // Check if maturant already exists
        Maturant existing = maturantRepo.findById(maturant.getLdapUser());
        if (existing != null) {
            log.warn("Maturant with LDAP-User {} already exists", maturant.getLdapUser());
            return false;
        }

        maturantRepo.persist(maturant);
        log.info("Created new maturant: {}", maturant.getLdapUser());
        return true;
    }

    @Transactional
    public int uploadMaturantenFromCSV(String csvContent) {
        log.info("Starting CSV upload");
        List<Maturant> maturanten = parseCSV(csvContent);
        
        for (Maturant maturant : maturanten) {
            Maturant existing = maturantRepo.findById(maturant.getLdapUser());
            if (existing != null) {
                // Update existing maturant
                existing.setFirstName(maturant.getFirstName());
                existing.setLastName(maturant.getLastName());
                existing.setClassName(maturant.getClassName());
                maturantRepo.persist(existing);
            } else {
                // Create new maturant
                maturantRepo.persist(maturant);
            }
        }
        
        log.info("Successfully uploaded {} maturanten", maturanten.size());
        return maturanten.size();
    }

    private List<Maturant> parseCSV(String csvContent) {
        List<Maturant> maturanten = new ArrayList<>();
        
        try (BufferedReader reader = new BufferedReader(new StringReader(csvContent))) {
            String line;
            boolean firstLine = true;
            
            while ((line = reader.readLine()) != null) {
                // Skip header and empty lines
                if (firstLine || line.trim().isEmpty()) {
                    firstLine = false;
                    continue;
                }
                
                String[] parts = line.split(";");
                if (parts.length >= 4) {
                    String ldapUser = parts[0].trim();
                    String firstName = parts[1].trim();
                    String lastName = parts[2].trim();
                    String className = parts[3].trim();
                    
                    // Skip if LDAP-User is empty
                    if (ldapUser.isEmpty()) {
                        continue;
                    }
                    
                    Maturant maturant = new Maturant(ldapUser, firstName, lastName, className);
                    
                    maturanten.add(maturant);
                    log.debug("Parsed maturant: {} {} ({})", firstName, lastName, ldapUser);
                }
            }
        } catch (Exception e) {
            log.error("Error parsing CSV", e);
            throw new RuntimeException("Failed to parse CSV: " + e.getMessage());
        }
        
        return maturanten;
    }

    public List<Maturant> getAllMaturanten() {
        return maturantRepo.listAll();
    }

    public long getMaturantenCount() {
        return maturantRepo.count();
    }

    @Transactional
    public boolean updateMaturant(String ldapUser, Maturant updatedMaturant) {
        Maturant existing = maturantRepo.findById(ldapUser);
        if (existing == null) {
            return false;
        }

        existing.setFirstName(updatedMaturant.getFirstName());
        existing.setLastName(updatedMaturant.getLastName());
        existing.setClassName(updatedMaturant.getClassName());
        maturantRepo.persist(existing);
        
        log.info("Updated maturant: {}", ldapUser);
        return true;
    }

    @Transactional
    public boolean deleteMaturant(String ldapUser) {
        Maturant existing = maturantRepo.findById(ldapUser);
        if (existing == null) {
            return false;
        }

        maturantRepo.delete(existing);
        log.info("Deleted maturant: {}", ldapUser);
        return true;
    }

    @Transactional
    public long deleteAllMaturanten() {
        long count = maturantRepo.count();
        maturantRepo.deleteAll();
        log.info("Deleted all maturanten: {} entries", count);
        return count;
    }
}
