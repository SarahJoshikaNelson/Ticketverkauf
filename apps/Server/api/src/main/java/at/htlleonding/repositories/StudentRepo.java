package at.htlleonding.repositories;

import at.htlleonding.types.Student;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class StudentRepo implements PanacheRepositoryBase<Student, String> {
}
