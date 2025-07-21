
export interface FormValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class FormValidator {
  static validateLeaderboardForm(data: any): FormValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.name || data.name.trim() === '') {
      errors.push('Leaderboard name is required');
    }

    if (!data.startDate) {
      errors.push('Start date is required');
    }

    if (!data.fields || data.fields.length === 0) {
      errors.push('At least one metadata field is required');
    }

    if (data.fields && data.fields.some((field: any) => !field.value)) {
      errors.push('All metadata fields must have a value');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  static validateQuestForm(data: any): FormValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.name || data.name.trim() === '') {
      errors.push('Quest name is required');
    }

    if (!data.description || data.description.trim() === '') {
      errors.push('Quest description is required');
    }

    if (!data.startDate) {
      errors.push('Start date is required');
    }

    if (!data.endDate) {
      errors.push('End date is required');
    }

    if (new Date(data.endDate) <= new Date(data.startDate)) {
      errors.push('End date must be after start date');
    }

    if (!data.conditions || data.conditions.length === 0) {
      errors.push('At least one quest condition is required');
    }

    if (!data.rewards || data.rewards.length === 0) {
      errors.push('At least one reward is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  static validateTournamentForm(data: any): FormValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.name || data.name.trim() === '') {
      errors.push('Tournament name is required');
    }

    if (!data.description || data.description.trim() === '') {
      errors.push('Tournament description is required');
    }

    if (!data.startDate) {
      errors.push('Start date is required');
    }

    if (!data.endDate) {
      errors.push('End date is required');
    }

    if (new Date(data.endDate) <= new Date(data.startDate)) {
      errors.push('End date must be after start date');
    }

    if (!data.maxParticipants || data.maxParticipants < 2) {
      errors.push('Maximum participants must be at least 2');
    }

    if (!data.prizes || data.prizes.length === 0) {
      warnings.push('No placement rewards defined');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  static validateCommunityForm(data: any): FormValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.name || data.name.trim() === '') {
      errors.push('Community name is required');
    }

    if (!data.description || data.description.trim() === '') {
      errors.push('Community description is required');
    }

    if (!data.referralGame || data.referralGame.trim() === '') {
      errors.push('Referral game name is required');
    }

    if (!data.referralSlug || data.referralSlug.trim() === '') {
      errors.push('Referral slug is required');
    }

    if (!data.referralDestination || data.referralDestination.trim() === '') {
      errors.push('URL destination is required');
    }

    if (!data.referralDestination.startsWith('http')) {
      warnings.push('URL destination should include protocol (http/https)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  static validateBattlePassForm(data: any): FormValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.name || data.name.trim() === '') {
      errors.push('Battle Pass name is required');
    }

    if (!data.description || data.description.trim() === '') {
      errors.push('Battle Pass description is required');
    }

    if (!data.startDate) {
      errors.push('Start date is required');
    }

    if (!data.endDate) {
      errors.push('End date is required');
    }

    if (new Date(data.endDate) <= new Date(data.startDate)) {
      errors.push('End date must be after start date');
    }

    if (!data.maxTier || data.maxTier < 1) {
      errors.push('Max tier must be at least 1');
    }

    if (!data.premiumPrice || data.premiumPrice < 0) {
      errors.push('Premium price must be a positive number');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
