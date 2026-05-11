import type { TemplateFields } from "@/lib/agent/templateFields";
import type { PredefinedQuestion } from "@/lib/agent/predefinedQuestions";

function fillTemplate(template: string, fields: TemplateFields): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const v = fields[key];
    return v !== undefined ? v : `«${key}»`;
  });
}

export async function renderGuidedAnswer(
  question: PredefinedQuestion,
  fields: TemplateFields,
): Promise<string> {
  return fillTemplate(question.template, fields);
}
