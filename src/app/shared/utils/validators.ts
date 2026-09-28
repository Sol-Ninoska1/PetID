import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const matchFields =
  (field: string, confirmField: string): ValidatorFn =>
  (group: AbstractControl): ValidationErrors | null =>
    group.get(field)?.value === group.get(confirmField)?.value ? null : { mismatch: true };

export const notInFuture: ValidatorFn = (control) =>
  control.value && new Date(control.value) > new Date() ? { future: true } : null;

/** Shows a control's error only after the user interacted with it. */
export const showError = (control: AbstractControl | null, error?: string) =>
  !!control && control.touched && (error ? control.hasError(error) : control.invalid);
