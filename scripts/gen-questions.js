const fs = require('fs');

const FORM_CONFIGS = {
  'ai-engineer':    { slug: 'ai-engineer',    varName: 'aiEngineer',    position: 'AI Engineer',               totalPoints: 57, pointsMap: {1:5,2:5,3:4,4:2,5:2,6:4,7:2,8:3,9:3,10:2,11:3,12:4,13:2,14:3,15:3,16:5,17:3,18:2} },
  'data-engineer':  { slug: 'data-engineer',  varName: 'dataEngineer',  position: 'Data Engineer',             totalPoints: 60, pointsMap: {1:2,2:2,3:3,4:3,5:3,6:4,7:4,8:4,9:2,10:2,11:2,12:3,13:3,14:3,15:5,16:5,17:5,18:5} },
  'data-science':   { slug: 'data-science',   varName: 'dataScience',   position: 'Data Science',              totalPoints: 60, pointsMap: {1:2,2:2,3:3,4:3,5:2,6:3,7:4,8:3,9:4,10:4,11:2,12:3,13:2,14:3,15:5,16:5,17:5,18:5} },
  'node-react':     { slug: 'node-react',     varName: 'nodeReact',     position: 'React & Node.js',           totalPoints: 70, pointsMap: {1:5,2:5,3:5,4:5,5:5,6:4,7:4,8:4,9:4,10:4,11:3,12:3,13:3,14:3,15:3,16:2,17:4,18:4} },
  'devops':         { slug: 'devops',         varName: 'devops',        position: 'DevOps Engineer',           totalPoints: 60, pointsMap: {1:2,2:2,3:2,4:2,5:2,6:3,7:3,8:3,9:3,10:3,11:3,12:4,13:4,14:4,15:5,16:5,17:5,18:5} },
  'kg-engineer':    { slug: 'kg-engineer',    varName: 'kgEngineer',    position: 'Knowledge Graph Engineer',  totalPoints: 50, pointsMap: {1:2,2:2,3:2,4:3,5:3,6:3,7:3,8:3,9:3,10:4,11:4,12:4,13:4,14:5,15:5} },
  'ai-qa-engineer': { slug: 'ai-qa-engineer', varName: 'aiQaEngineer',  position: 'AI QA Engineer',            totalPoints: 50, pointsMap: {1:2,4:2,7:2,2:3,5:3,8:3,10:3,12:3,14:3,3:4,6:4,11:4,13:4,9:5,15:5} },
};

// escape for single-quoted JS string
function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

let out = '// AUTO-GENERATED — do not edit manually\n\n';
out += "export type Difficulty = 'easy' | 'medium' | 'hard' | 'critical'\n\n";
out += 'export interface QuestionDef {\n  id: number\n  title: string\n  difficulty: Difficulty\n  points: number\n  answers: string[]\n}\n\n';
out += 'export interface FormDef {\n  slug: string\n  position: string\n  totalPoints: number\n  questions: QuestionDef[]\n}\n\n';

for (const [fname, config] of Object.entries(FORM_CONFIGS)) {
  const html = fs.readFileSync('D:/splendit-suite/interview-system/forms/' + fname + '.html', 'utf8');
  const blocks = html.split('<div class="question-block ').slice(1);
  const questions = [];

  blocks.forEach((block, idx) => {
    const qNum = idx + 1;
    const diffMatch = block.match(/^(easy|medium|hard|critical)/);
    const diff = diffMatch ? diffMatch[1] : 'easy';

    const titleMatch = block.match(/class="question-title"[^>]*>([\s\S]*?)<\/div>/);
    if (!titleMatch) return;
    const title = titleMatch[1].trim().replace(/\s+/g, ' ').replace(/<[^>]+>/g, '');

    const answerMatches = [...block.matchAll(/class="answer-text[^"]*"[^>]*>([\s\S]*?)<\/span>/g)];
    const answers = answerMatches
      .map(m => m[1].trim().replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
      .filter(a => a.length > 0);

    const pts = config.pointsMap[qNum] || 2;
    questions.push({ id: qNum, title, difficulty: diff, points: pts, answers });
  });

  out += 'export const ' + config.varName + 'Form: FormDef = {\n';
  out += "  slug: '" + esc(config.slug) + "',\n";
  out += "  position: '" + esc(config.position) + "',\n";
  out += '  totalPoints: ' + config.totalPoints + ',\n';
  out += '  questions: [\n';

  questions.forEach(q => {
    out += '    {\n';
    out += '      id: ' + q.id + ',\n';
    out += "      difficulty: '" + q.difficulty + "' as Difficulty,\n";
    out += '      points: ' + q.points + ',\n';
    out += "      title: '" + esc(q.title) + "',\n";
    out += '      answers: [\n';
    q.answers.forEach(a => { out += "        '" + esc(a) + "',\n"; });
    out += '      ],\n';
    out += '    },\n';
  });
  out += '  ],\n}\n\n';
}

out += 'export const ALL_FORMS: FormDef[] = [\n';
for (const config of Object.values(FORM_CONFIGS)) { out += '  ' + config.varName + 'Form,\n'; }
out += ']\n\n';
out += "export function getFormBySlug(slug: string): FormDef | undefined {\n  return ALL_FORMS.find(f => f.slug === slug)\n}\n";

fs.writeFileSync('D:/splendit-suite/lib/ims-questions.ts', out);
console.log('Done! Lines:', out.split('\n').length);
