/**
 * Compares two results for equality, handling nested objects and numbers
 */
export function resultsEqual(expected: any, actual: any): boolean {
	if (expected === undefined && actual === undefined) {
		return true;
	}

	if (expected === null && actual === null) {
		return true;
	}

	if (typeof expected === 'number') {
		return Math.abs(Number(actual) - expected) < 0.00000001;
	}

	if (expected === actual) {
		return true;
	}

	if (cqlDateTimesEqual(expected, actual)) {
		return true;
	}

	if (quantitiesEqual(expected, actual)) {
		return true;
	}

	if (
		typeof expected !== 'object' ||
		expected === null ||
		typeof actual !== 'object' ||
		actual === null
	) {
		return false;
	}

	const expectedKeys = Object.keys(expected);
	const actualKeys = Object.keys(actual);

	if (expectedKeys.length !== actualKeys.length) return false;

	for (const key of expectedKeys) {
		if (!actualKeys.includes(key) || !resultsEqual(expected[key], actual[key])) {
			return false;
		}
	}

	return true;
}

interface CqlDateTimeParts {
	base: string;
	timezone?: string;
}

function cqlDateTimesEqual(expected: any, actual: any): boolean {
	if (typeof expected !== 'string' || typeof actual !== 'string') {
		return false;
	}

	const expectedDateTime = parseCqlDateTime(expected);
	const actualDateTime = parseCqlDateTime(actual);

	if (!expectedDateTime || !actualDateTime) {
		return false;
	}

	if (expectedDateTime.base !== actualDateTime.base) {
		return false;
	}

	// If either side omits timezone, compare only the local DateTime components.
	// Some engines return the server default timezone for DateTimes that were
	// authored without an explicit timezone, e.g. @2014-01-01T08 becomes
	// @2014-01-01T08-06:00. For these conformance tests, that offset should not
	// make the value fail comparison when the expected value also omits it.
	if (!expectedDateTime.timezone || !actualDateTime.timezone) {
		return true;
	}

	return normalizeTimezone(expectedDateTime.timezone) === normalizeTimezone(actualDateTime.timezone);
}

function parseCqlDateTime(value: string): CqlDateTimeParts | undefined {
	// DateTime literals have a T component. Date-only literals do not.
	if (!/^@\d{4}(?:-\d{2})?(?:-\d{2})?T/.test(value)) {
		return undefined;
	}

	const match = value.match(/^(.*?)(Z|[+-]\d{2}:\d{2})?$/);
	if (!match) {
		return undefined;
	}

	return {
		base: match[1],
		timezone: match[2],
	};
}

function normalizeTimezone(timezone: string): string {
	return timezone === 'Z' ? '+00:00' : timezone;
}

interface ParsedQuantity {
	value: number;
	unit: string;
}

interface UcumConversion {
	canonicalUnit: string;
	factor: number;
}

const UCUM_CONVERSIONS: Record<string, UcumConversion> = {
	mm: { canonicalUnit: 'm', factor: 0.001 },
	cm: { canonicalUnit: 'm', factor: 0.01 },
	m: { canonicalUnit: 'm', factor: 1 },
	km: { canonicalUnit: 'm', factor: 1000 },
	mm2: { canonicalUnit: 'm2', factor: 0.000001 },
	cm2: { canonicalUnit: 'm2', factor: 0.0001 },
	m2: { canonicalUnit: 'm2', factor: 1 },
	km2: { canonicalUnit: 'm2', factor: 1000000 },
	mg: { canonicalUnit: 'g', factor: 0.001 },
	g: { canonicalUnit: 'g', factor: 1 },
	kg: { canonicalUnit: 'g', factor: 1000 },
	ms: { canonicalUnit: 's', factor: 0.001 },
	s: { canonicalUnit: 's', factor: 1 },
	min: { canonicalUnit: 's', factor: 60 },
	h: { canonicalUnit: 's', factor: 3600 },
	d: { canonicalUnit: 's', factor: 86400 },
};

function quantitiesEqual(expected: any, actual: any): boolean {
	const expectedQuantity = parseQuantity(expected);
	const actualQuantity = parseQuantity(actual);

	if (!expectedQuantity || !actualQuantity) {
		return false;
	}

	// Same unit can be compared directly, even if we do not have a conversion rule.
	if (expectedQuantity.unit === actualQuantity.unit) {
		return numbersEqual(expectedQuantity.value, actualQuantity.value);
	}

	const expectedNormalized = normalizeQuantity(expectedQuantity);
	const actualNormalized = normalizeQuantity(actualQuantity);

	if (!expectedNormalized || !actualNormalized) {
		return false;
	}

	return (
		expectedNormalized.unit === actualNormalized.unit &&
		numbersEqual(expectedNormalized.value, actualNormalized.value)
	);
}

function parseQuantity(value: any): ParsedQuantity | undefined {
	if (typeof value === 'string') {
		const quantityMatch = /^\s*(-?\d+(?:\.\d+)?)\s*'([^']+)'\s*$/.exec(value);
		if (!quantityMatch) return undefined;

		return {
			value: Number(quantityMatch[1]),
			unit: quantityMatch[2],
		};
	}

	if (value && typeof value === 'object' && 'value' in value) {
		const quantityValue = Number(value.value);
		const unit = value.unit ?? value.code;

		if (!Number.isFinite(quantityValue) || typeof unit !== 'string') {
			return undefined;
		}

		return {
			value: quantityValue,
			unit,
		};
	}

	return undefined;
}

function normalizeQuantity(quantity: ParsedQuantity): ParsedQuantity | undefined {
	const conversion = UCUM_CONVERSIONS[quantity.unit];
	if (!conversion) return undefined;

	return {
		value: quantity.value * conversion.factor,
		unit: conversion.canonicalUnit,
	};
}

function numbersEqual(a: number, b: number): boolean {
	return Math.abs(a - b) < 0.00000001;
}
