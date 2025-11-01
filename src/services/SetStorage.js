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

  saveDisciplines(disciplineManager, selectedSet = null, selectedPage = 1, selectedLevelBySubject = null) {
    const disciplines = {};
    
    disciplineManager.getDisciplines().forEach(discipline => {
      const levels = {};
      discipline.getLevels().forEach(level => {
        levels[level.level] = {
          level: level.level,
          sets: level.sets.map(wb => this.serializeSet(wb)),
          currentSet: this.findCurrentSet(level.sets),
          lastCompleted: this.findLastCompleted(level.sets)
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
      selectedSet: selectedSet ? {
        slug: this.slugOf(selectedSet),
        page: selectedPage,
        subject: selectedSet.subject,
        level: selectedSet.level
      } : null,
      selectedLevelBySubject: selectedLevelBySubject || {}
    };

    return this.save(payload);
  }

  loadDisciplines() {
    return this.load();
  }

  serializeSet(wb) {
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

      const savedLevels = savedDiscipline.levels || savedDiscipline.lessons || {};
      
      discipline.loadedLevels.forEach((sets, level) => {
        const savedLevel = savedLevels[level];
        if (!savedLevel) return;

        const mergedSets = sets.map(wb => {
          const savedSet = (savedLevel.sets || savedLevel.workbooks || []).find(s => 
            s.id === SetStorage.idOf(wb) || s.title === wb.title
          );
          return savedSet ? this.mergeSet(wb, savedSet) : wb;
        });

        discipline.loadedLevels.set(level, mergedSets);
      });

      discipline.currentLevel = savedDiscipline.currentLevel || savedDiscipline.currentLesson || discipline.availableLevels[0];
    });

    return savedData.selectedSet;
  }

  mergeSet(currentWb, savedWb) {
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

  // Migration function to convert old storage formats to new formats
  migrateStorageFormat(savedData) {
    if (!savedData || !savedData.disciplines) return false;

    let wasMigrated = false;

    // Migrate selectedWorkbook to selectedSet
    if (savedData.selectedWorkbook && !savedData.selectedSet) {
      savedData.selectedSet = savedData.selectedWorkbook;
      delete savedData.selectedWorkbook;
      wasMigrated = true;
    }

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

      // Migrate workbooks to sets in each level
      if (discipline.levels) {
        Object.values(discipline.levels).forEach(level => {
          // If level has 'workbooks' but not 'sets', migrate it
          if (level.workbooks && !level.sets) {
            level.sets = level.workbooks;
            delete level.workbooks;
            wasMigrated = true;
          }

          // If level has 'currentWorkbook' but not 'currentSet', migrate it
          if (level.currentWorkbook && !level.currentSet) {
            level.currentSet = level.currentWorkbook;
            delete level.currentWorkbook;
            wasMigrated = true;
          }
        });
      }
    });

    return wasMigrated;
  }

  findCurrentSet(sets) {
    const inProgress = sets.find(wb => wb.attempts > 0 && !wb.completed);
    if (inProgress) return inProgress.title;
    
    const lastCompleted = sets.filter(wb => wb.completed).sort((a, b) => 
      (b.history?.slice(-1)[0]?.ts || 0) - (a.history?.slice(-1)[0]?.ts || 0)
    )[0];
    
    return lastCompleted?.title || sets[0]?.title;
  }

  findLastCompleted(sets) {
    const completed = sets.filter(wb => wb.completed);
    if (!completed.length) return null;
    
    return completed.sort((a, b) => 
      (b.history?.slice(-1)[0]?.ts || 0) - (a.history?.slice(-1)[0]?.ts || 0)
    )[0]?.title;
  }

  findCurrentLevel(levels) {
    const levelProgress = levels.map(level => {
      const completedCount = level.sets.filter(wb => wb.completed).length;
      const totalCount = level.sets.length;
      const inProgressCount = level.sets.filter(wb => wb.attempts > 0 && !wb.completed).length;
      
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

  getTimer(setTitle) {
    const data = this.load();
    return data?.timers?.[setTitle] || null;
  }

  setTimer(setTitle, startTime) {
    const data = this.load() || {};
    if (!data.timers) data.timers = {};
    data.timers[setTitle] = startTime;
    return this.save(data);
  }

  removeTimer(setTitle) {
    const data = this.load();
    if (!data?.timers) return;
    delete data.timers[setTitle];
    return this.save(data);
  }
}


