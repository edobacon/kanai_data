---
id: RULE-uengagement-up1-fk-user-id-string-UPONE-1560
project: up1
type: rule
module: uengagement-up1
---

UPONE-1560 cambia core_User.id de Int a texto (string); el mod ajusta el tipo de los 5 campos FK correspondientes en objects/Feedback.json, Instructor.json, Journal.json, Student.json y StudentLogger.json para que sigan coincidiendo.

**sourceRef:** e1538a2 + objects/Student.json (FK a string) + Feedback.json, Instructor.json, Journal.json, StudentLogger.json.
