// src/services/SetStorage.js
import { GenericStorage } from "./GenericStorage.js";

export class SetStorage extends GenericStorage {
  constructor(key = 'futon_state_v2') { super(key); }

  static idOf(wb) {
    const t = String(wb?.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const s = String(wb?.subject || '').toLowerCase();
    const l = String(wb?.level || '').toUpperCase();
    return `${t}__${s}-${l}`;
  }

  saveDisciplines(disciplineManager, selectedWorkbook = null, selectedPage = 1, selectedLevelBySubject = null) {
    const disciplines = {};
    
    disciplineManager.getDisciplines().forEach(discipline => {
      const levels = {};
      discipline.getLevels().forEach(level => {
        levels[level.level] = {
          level: level.level,
          workbooks: level.workbooks.map(wb => this.serializeWorkbook(wb)),
          currentWorkbook: this.findCurrentWorkbook(level.workbooks),
          lastCompleted: this.findLastCompleted(level.workbooks)
        };
      });
      
      disciplines[discipline.name] = {
        name: discipline.name,
        levels,
        currentLevel: this.findCurrentLevel(discipline.getLevels())
      };
    });

    const payload = {
      disciplines,
      selectedWorkbook: selectedWorkbook ? {
        slug: this.slugOf(selectedWorkbook),
        page: selectedPage,
        subject: selectedWorkbook.subject,
        level: selectedWorkbook.level
      } : null,
      selectedLevelBySubject: selectedLevelBySubject || {}
    };

    return this.save(payload);
  }

  loadDisciplines() {
    return this.load();
  }

  serializeWorkbook(wb) {
    return {
      id: SetStorage.idOf(wb),
      title: wb.title,
      subject: wb.subject,
      level: wb.level,
      attempts: wb.attempts || 0,
      lastScore: wb.lastScore || 0,
      history: Array.isArray(wb.history) ? wb.history : [],
      gradePercent: wb.gradePercent || 0,
      status: wb.status || '',
      completed: !!wb.completed,
      durationSeconds: wb.durationSeconds || 0,
      avgSecondsPerExercise: wb.avgSecondsPerExercise || 0,
      completedPages: wb.completedPages || [],
      pages: (wb.pages || []).map(p => ({
        pageNumber: p.pageNumber,
        exercises: (p.exercises || []).map(e => ({ answer: e.answer ?? '' }))
      }))
    };
  }

  mergeDisciplines(disciplineManager, savedData) {
    if (!savedData || !savedData.disciplines) return;

    // Migrate old storage format to new format
    const wasMigrated = this.migrateStorageFormat(savedData);
    
    // If data was migrated, save it back to localStorage
    if (wasMigrated) {
      this.save(savedData);
    }

    disciplineManager.getDisciplines().forEach(discipline => {
      const savedDiscipline = savedData.disciplines[discipline.name];
      if (!savedDiscipline) return;

      discipline.workbooks = discipline.workbooks.map(wb => {
        // Handle backward compatibility: check for both new 'levels' and old 'lessons' format
        const savedLevels = savedDiscipline.levels || savedDiscipline.lessons || {};
        const savedLevel = savedLevels[wb.level];
        if (!savedLevel) return wb;
        
        const savedWorkbook = savedLevel.workbooks.find(s => 
          s.id === SetStorage.idOf(wb) || s.title === wb.title
        );
        if (!savedWorkbook) return wb;

        return this.mergeWorkbook(wb, savedWorkbook);
      });

      discipline.levels = discipline.groupWorkbooksByLevel();
      // Handle backward compatibility for currentLevel/currentLesson
      discipline.currentLevel = savedDiscipline.currentLevel || savedDiscipline.currentLesson || discipline.levels[0]?.level;
    });

    return savedData.selectedWorkbook;
  }

  mergeWorkbook(currentWb, savedWb) {
    const pages = (currentWb.pages || []).map(p => {
      const sp = (savedWb.pages || []).find(x => x.pageNumber === p.pageNumber);
      if (!sp) return p;
      return {
        ...p,
        exercises: (p.exercises || []).map((ex, idx) => ({ 
          ...ex, 
          answer: (sp.exercises[idx] && sp.exercises[idx].answer) || '' 
        }))
      };
    });

    return {
      ...currentWb,
      attempts: savedWb.attempts ?? currentWb.attempts,
      lastScore: savedWb.lastScore ?? currentWb.lastScore,
      history: Array.isArray(savedWb.history) ? savedWb.history : (currentWb.history || []),
      gradePercent: savedWb.gradePercent ?? currentWb.gradePercent,
      status: savedWb.status ?? currentWb.status,
      completed: !!(savedWb.completed ?? currentWb.completed),
      durationSeconds: savedWb.durationSeconds ?? currentWb.durationSeconds,
      avgSecondsPerExercise: savedWb.avgSecondsPerExercise ?? currentWb.avgSecondsPerExercise,
      completedPages: savedWb.completedPages || [],
      pages,
    };
  }

  // Migration function to convert old 'lessons' format to new 'levels' format
  migrateStorageFormat(savedData) {
    if (!savedData || !savedData.disciplines) return false;

    let wasMigrated = false;

    Object.values(savedData.disciplines).forEach(discipline => {
      // If discipline has 'lessons' but not 'levels', migrate it
      if (discipline.lessons && !discipline.levels) {
        discipline.levels = discipline.lessons;
        delete discipline.lessons;
        wasMigrated = true;
      }
      
      // If discipline has 'currentLesson' but not 'currentLevel', migrate it
      if (discipline.currentLesson && !discipline.currentLevel) {
        discipline.currentLevel = discipline.currentLesson;
        delete discipline.currentLesson;
        wasMigrated = true;
      }
    });

    return wasMigrated;
  }

  findCurrentWorkbook(workbooks) {
    const inProgress = workbooks.find(wb => wb.attempts > 0 && !wb.completed);
    if (inProgress) return inProgress.title;
    
    const lastCompleted = workbooks.filter(wb => wb.completed).sort((a, b) => 
      (b.history?.slice(-1)[0]?.ts || 0) - (a.history?.slice(-1)[0]?.ts || 0)
    )[0];
    
    return lastCompleted?.title || workbooks[0]?.title;
  }

  findLastCompleted(workbooks) {
    const completed = workbooks.filter(wb => wb.completed);
    if (!completed.length) return null;
    
    return completed.sort((a, b) => 
      (b.history?.slice(-1)[0]?.ts || 0) - (a.history?.slice(-1)[0]?.ts || 0)
    )[0]?.title;
  }

  findCurrentLevel(levels) {
    const levelProgress = levels.map(level => {
      const completedCount = level.workbooks.filter(wb => wb.completed).length;
      const totalCount = level.workbooks.length;
      const inProgressCount = level.workbooks.filter(wb => wb.attempts > 0 && !wb.completed).length;
      
      return {
        level: level.level,
        completedCount,
        totalCount,
        inProgressCount,
        completionRate: totalCount > 0 ? completedCount / totalCount : 0
      };
    });

    // Find level with work in progress
    const inProgress = levelProgress.find(l => l.inProgressCount > 0);
    if (inProgress) return inProgress.level;

    // Find level with partial completion
    const partial = levelProgress.find(l => l.completedCount > 0 && l.completedCount < l.totalCount);
    if (partial) return partial.level;

    // Find next incomplete level
    const incomplete = levelProgress.find(l => l.completedCount === 0);
    if (incomplete) return incomplete.level;

    // Default to first level
    return levels[0]?.level;
  }

  slugOf(wb) {
    return String(wb?.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
}


