package at.htlleonding.repositories;

import at.htlleonding.types.Student;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.common.QuarkusTestResource;
import at.htlleonding.test.EmbeddedPostgresResource;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@QuarkusTest
@QuarkusTestResource(EmbeddedPostgresResource.class)
class StudentRepoTest {

    @Inject
    StudentRepo studentRepo;

    private Student testStudent;

    @BeforeEach
    @Transactional
    void setUp() {
        // Clean up
        studentRepo.deleteAll();

        // Create test student
        testStudent = new Student();
        testStudent.setId("s12345");
        testStudent.setBoughtTicket(false);
        studentRepo.persist(testStudent);
    }

    @AfterEach
    @Transactional
    void tearDown() {
        studentRepo.deleteAll();
    }

    @Test
    @Transactional
    void testPersistStudent() {
        // Given
        Student newStudent = new Student();
        newStudent.setId("s67890");
        newStudent.setBoughtTicket(false);

        // When
        studentRepo.persist(newStudent);

        // Then
        Student found = studentRepo.findById("s67890");
        assertThat(found).isNotNull();
        assertThat(found.getId()).isEqualTo("s67890");
        assertThat(found.isBoughtTicket()).isFalse();
    }

    @Test
    void testFindById() {
        // When
        Student found = studentRepo.findById("s12345");

        // Then
        assertThat(found).isNotNull();
        assertThat(found.getId()).isEqualTo("s12345");
        assertThat(found.isBoughtTicket()).isFalse();
    }

    @Test
    void testListAll() {
        // When
        List<Student> students = studentRepo.listAll();

        // Then
        assertThat(students).hasSize(1);
        assertThat(students.get(0).getId()).isEqualTo("s12345");
    }

    @Test
    @Transactional
    void testUpdateStudent() {
        // Given
        Student student = studentRepo.findById("s12345");

        // When
        student.setBoughtTicket(true);
        studentRepo.persist(student);

        // Then
        Student updated = studentRepo.findById("s12345");
        assertThat(updated.isBoughtTicket()).isTrue();
    }

    @Test
    @Transactional
    void testDeleteStudent() {
        // Given
        String studentId = testStudent.getId();

        // When
        studentRepo.delete(testStudent);

        // Then
        Student deleted = studentRepo.findById(studentId);
        assertThat(deleted).isNull();
    }

    @Test
    @Transactional
    void testStudentWhoHasBoughtTicket() {
        // Given
        Student student = new Student();
        student.setId("s99999");
        student.setBoughtTicket(true);

        // When
        studentRepo.persist(student);

        // Then
        Student found = studentRepo.findById("s99999");
        assertThat(found.isBoughtTicket()).isTrue();
    }

    @Test
    @Transactional
    void testFindStudentsWhoBoughtTickets() {
        // Given
        Student student1 = new Student();
        student1.setId("s11111");
        student1.setBoughtTicket(true);
        studentRepo.persist(student1);

        Student student2 = new Student();
        student2.setId("s22222");
        student2.setBoughtTicket(false);
        studentRepo.persist(student2);

        Student student3 = new Student();
        student3.setId("s33333");
        student3.setBoughtTicket(true);
        studentRepo.persist(student3);

        // When
        List<Student> studentsWithTickets = studentRepo.find("boughtTicket", true).list();

        // Then
        assertThat(studentsWithTickets).hasSize(2);
        assertThat(studentsWithTickets).extracting(Student::getId)
                .containsExactlyInAnyOrder("s11111", "s33333");
    }

    @Test
    @Transactional
    void testFindStudentsWithoutTickets() {
        // Given
        Student student1 = new Student();
        student1.setId("s11111");
        student1.setBoughtTicket(true);
        studentRepo.persist(student1);

        Student student2 = new Student();
        student2.setId("s22222");
        student2.setBoughtTicket(false);
        studentRepo.persist(student2);

        // When
        List<Student> studentsWithoutTickets = studentRepo.find("boughtTicket", false).list();

        // Then
        assertThat(studentsWithoutTickets).hasSize(2); // s12345 + s22222
        assertThat(studentsWithoutTickets).extracting(Student::getId)
                .contains("s12345", "s22222");
    }

    @Test
    void testCount() {
        // When
        long count = studentRepo.count();

        // Then
        assertThat(count).isEqualTo(1);
    }

    @Test
    void testFindByNonExistentId() {
        // When
        Student found = studentRepo.findById("nonexistent");

        // Then
        assertThat(found).isNull();
    }

    @Test
    @Transactional
    void testMultipleStudents() {
        // Given
        for (int i = 1; i <= 10; i++) {
            Student student = new Student();
            student.setId("s" + String.format("%05d", i));
            student.setBoughtTicket(i % 2 == 0); // Even numbered students bought tickets
            studentRepo.persist(student);
        }

        // When
        List<Student> allStudents = studentRepo.listAll();

        // Then
        assertThat(allStudents).hasSize(11); // 10 new + 1 from setUp
    }
}

