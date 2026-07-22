import CourseAccordion from "./CourseAccordion";

export default function CourseAccordionList({
  courses,
  expandedCodes,
  onToggle,
  highlightedDays = [],
  highlightCode = null,
  registerRef = null,
}) {
  return (
    <div className="space-y-3">
      {courses.map((course) => (
        <CourseAccordion
          key={course.courseCode}
          course={course}
          expanded={expandedCodes.has(course.courseCode)}
          onToggle={() => onToggle(course.courseCode)}
          highlightedDays={highlightedDays}
          highlight={highlightCode === course.courseCode}
          courseRef={
            registerRef ? (el) => registerRef(course.courseCode, el) : undefined
          }
        />
      ))}
    </div>
  );
}
