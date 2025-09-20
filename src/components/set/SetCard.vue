<template lang="pug">
  .lesson-card(:class="{ 'lesson-card--active': isActive, 'lesson-card--disabled': !canStart }")
    .lesson-card__header
      .lesson-card__title-section
        h5.lesson-card__title {{ workbook.title }}
      .lesson-card__status(v-if="workbook.status")
        Badge(:variant="statusVariant" :class="statusClass")
          span.lesson-card__status-icon {{ statusIcon }}
          span {{ statusText }}
    
    .lesson-card__content
      .lesson-card__progress-section
        .lesson-card__progress-header
          span.lesson-card__progress-label {{ $t('progress') || 'Progresso' }}
          span.lesson-card__progress-text {{ progress.completed }}/{{ totalPages }} páginas
        Progress(:value="progress.percent" show-value height="8px" variant="success")
      
      .lesson-card__stats(v-if="workbook.lastScore || workbook.avgSecondsPerExercise")
        .lesson-card__stat(v-if="workbook.lastScore")
          .lesson-card__stat-icon 🎯
          .lesson-card__stat-content
            .lesson-card__stat-label {{ $t('lastScore') }}
            .lesson-card__stat-value {{ workbook.lastScore }}/{{ workbook.totalExercises }}
        
        .lesson-card__stat(v-if="workbook.avgSecondsPerExercise")
          .lesson-card__stat-icon ⏱️
          .lesson-card__stat-content
            .lesson-card__stat-label {{ $t('avgTime') || 'Avg Time' }}
            .lesson-card__stat-value {{ workbook.avgSecondsPerExercise }}s/ex
            .lesson-card__speed-gauge.mt-1
              Progress(:value="speedGaugeWidth" :variant="speedGaugeVariant" height="4px")
      
      .lesson-card__grade(v-if="workbook.gradePercent")
        .lesson-card__grade-circle(:class="`grade-${getGradeColor(workbook.gradePercent)}`")
          span {{ workbook.gradePercent }}%
    
    .lesson-card__footer
      .lesson-card__badges
        Badge(variant="success" v-if="workbook.completed" class="lesson-card__badge")
          CheckCircle(:size="14")
          span {{ $t('completed') }}
        Badge(variant="warning" v-if="workbook.comingSoon" class="lesson-card__badge")
          Clock(:size="14")
          span {{ $t('comingSoon') }}
      
      Button(
        :variant="buttonVariant" 
        :disabled="!canStart" 
        @click.prevent="onStart"
        :class="buttonClass"
      )
        component.lesson-card__button-icon(:is="buttonIcon" :size="16")
        span {{ buttonText }}
</template>

<script>
import Button from "../ui/Button.vue";
import Badge from "../ui/Badge.vue";
import Progress from "../ui/Progress.vue";
import { Play, RotateCcw, Lock, CheckCircle, Clock } from 'lucide-vue-next';

export default {
  name: 'SetCard',
  components: {
    Button,
    Badge,
    Progress,
    Play,
    RotateCcw,
    Lock,
    CheckCircle,
    Clock,
  },
  props: {
    workbook: { type: Object, required: true },
    isActive: { type: Boolean, default: false },
  },
  computed: {
    totalPages() { return this.workbook.pages ? this.workbook.pages.length : 0; },
    progress() {
      const completed = (this.workbook.completedPages || []).length;
      const percent = this.totalPages ? Math.round((completed / this.totalPages) * 100) : 0;
      return { completed, percent };
    },
    canStart() { return !this.workbook.comingSoon; },
    speedTarget() {
      const defaults = { maxAvgSecondsPerExercise: 6 };
      const pc = { ...defaults, ...(this.workbook.passCriteria || {}) };
      return pc.maxAvgSecondsPerExercise;
    },
    speedGaugeWidth() {
      const s = Number(this.workbook.avgSecondsPerExercise) || 0;
      const maxS = Number(this.speedTarget) || 6;
      const val = Math.max(0, Math.min(100, 100 * (1 - s / (maxS * 2))));
      return Math.round(val);
    },
    speedGaugeVariant() {
      const s = Number(this.workbook.avgSecondsPerExercise) || 0;
      const maxS = Number(this.speedTarget) || 6;
      if (s <= maxS) return 'success';
      if (s <= maxS * 1.2) return 'warning';
      return 'danger';
    },
    statusVariant() {
      if (this.workbook.status === 'mastery') return 'success';
      if (this.workbook.status === 'pass') return 'warning';
      return 'danger';
    },
    statusClass() {
      return `lesson-card__status-badge lesson-card__status-badge--${this.workbook.status}`;
    },
    statusIcon() {
      if (this.workbook.status === 'mastery') return '⭐';
      if (this.workbook.status === 'pass') return '✓';
      return '↻';
    },
    statusText() {
      if (this.workbook.status === 'mastery') return this.$t('mastery') || 'Mastery';
      if (this.workbook.status === 'pass') return this.$t('pass') || 'Pass';
      return this.$t('retry') || 'Retry';
    },
    buttonVariant() {
      if (!this.canStart) return 'secondary';
      if (this.isActive) return 'success';
      return 'primary';
    },
    buttonClass() {
      return `lesson-card__button ${this.isActive ? 'lesson-card__button--active' : ''}`;
    },
    buttonIcon() {
      if (!this.canStart) return 'Lock';
      if (this.workbook.completed) return 'RotateCcw';
      return 'Play';
    },
    buttonText() {
      if (!this.canStart) return this.$t('comingSoon');
      if (this.workbook.completed) return this.$t('restart') || 'Restart';
      return this.$t('start');
    },
  },
  methods: {
    onStart() {
      if (!this.canStart) return;
      this.$emit('start', this.workbook);
    },
    getGradeColor(grade) {
      if (grade >= 90) return 'excellent';
      if (grade >= 80) return 'good';
      if (grade >= 70) return 'average';
      return 'poor';
    }
  }
};
</script>

<style scoped>
.lesson-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.8);
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.lesson-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #007bff, #0056b3);
  border-radius: 16px 16px 0 0;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.lesson-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  border-color: rgba(0, 123, 255, 0.2);
}

.lesson-card:hover::before {
  opacity: 1;
}

.lesson-card--active {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-color: #2196f3;
  box-shadow: 0 8px 30px rgba(33, 150, 243, 0.2);
}

.lesson-card--active::before {
  opacity: 1;
  background: linear-gradient(90deg, #2196f3, #1976d2);
}

.lesson-card--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.lesson-card--disabled:hover {
  transform: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

/* Header */
.lesson-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.lesson-card__title-section {
  flex: 1;
}

.lesson-card__title {
  color: #2c3e50;
  font-weight: 700;
  font-size: 1.25rem;
  line-height: 1.3;
  margin: 0;
  letter-spacing: -0.025em;
}

.lesson-card__status {
  margin-left: 12px;
}

.lesson-card__status-badge {
  font-size: 0.75rem;
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.lesson-card__status-icon {
  font-size: 0.9rem;
}

.lesson-card__status-badge--mastery {
  background: linear-gradient(135deg, #28a745, #20c997);
  border: none;
}

.lesson-card__status-badge--pass {
  background: linear-gradient(135deg, #ffc107, #fd7e14);
  color: #212529 !important;
  border: none;
}

.lesson-card__status-badge--retry {
  background: linear-gradient(135deg, #dc3545, #c82333);
  border: none;
}

/* Content */
.lesson-card__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.lesson-card__progress-section {
  background: rgba(248, 249, 250, 0.8);
  border-radius: 12px;
  padding: 16px;
}

.lesson-card__progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.lesson-card__progress-label {
  font-weight: 600;
  color: #495057;
  font-size: 0.9rem;
}

.lesson-card__progress-text {
  color: #6c757d;
  font-size: 0.85rem;
  font-weight: 500;
}

/* Stats */
.lesson-card__stats {
  display: flex;
  gap: 16px;
}

.lesson-card__stat {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.lesson-card__stat-icon {
  font-size: 1.2rem;
  min-width: 20px;
}

.lesson-card__stat-content {
  flex: 1;
}

.lesson-card__stat-label {
  font-size: 0.75rem;
  color: #6c757d;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.lesson-card__stat-value {
  font-size: 0.9rem;
  font-weight: 700;
  color: #2c3e50;
}

.lesson-card__speed-gauge {
  margin-top: 8px;
}

/* Grade Circle */
.lesson-card__grade {
  display: flex;
  justify-content: center;
  margin: 8px 0;
}

.lesson-card__grade-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: white;
  font-size: 0.9rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.lesson-card__grade-circle.grade-excellent {
  background: linear-gradient(135deg, #28a745, #20c997);
}

.lesson-card__grade-circle.grade-good {
  background: linear-gradient(135deg, #007bff, #0056b3);
}

.lesson-card__grade-circle.grade-average {
  background: linear-gradient(135deg, #ffc107, #fd7e14);
}

.lesson-card__grade-circle.grade-poor {
  background: linear-gradient(135deg, #dc3545, #c82333);
}

/* Footer */
.lesson-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 16px;
  gap: 12px;
}

.lesson-card__badges {
  display: flex;
  gap: 8px;
}

.lesson-card__badge {
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.lesson-card__button {
  background: linear-gradient(135deg, #007bff, #0056b3);
  border: none;
  border-radius: 12px;
  color: white;
  font-weight: 600;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
  min-width: 120px;
  justify-content: center;
}

.lesson-card__button-icon {
  width: 16px;
  height: 16px;
}

.lesson-card__button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 123, 255, 0.4);
  background: linear-gradient(135deg, #0056b3, #004085);
}

.lesson-card__button--active {
  background: linear-gradient(135deg, #28a745, #20c997);
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
}

.lesson-card__button--active:hover:not(:disabled) {
  background: linear-gradient(135deg, #20c997, #17a2b8);
  box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
}

.lesson-card__button:disabled {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
  box-shadow: none;
}

.lesson-card__button:disabled:hover {
  transform: none;
  box-shadow: none;
}

/* Responsive Design */
@media (max-width: 768px) {
  .lesson-card {
    padding: 20px;
  }
  
  .lesson-card__stats {
    flex-direction: column;
    gap: 12px;
  }
  
  .lesson-card__title {
    font-size: 1.15rem;
  }
  
  .lesson-card__button {
    padding: 10px 20px;
    font-size: 0.85rem;
  }
}

@media (max-width: 576px) {
  .lesson-card {
    padding: 16px;
  }
  
  .lesson-card__header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .lesson-card__status {
    margin-left: 0;
    align-self: flex-start;
  }
  
  .lesson-card__footer {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .lesson-card__button {
    width: 100%;
  }
}

/* Animation for new cards */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.lesson-card {
  animation: fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>


