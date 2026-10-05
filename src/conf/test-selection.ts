import type { OnlyItem, SkipItem } from '../models/config-types.js';

/** The names that identify one test: its suite (file), its group, and the test itself. */
export interface TestIdentity {
	testsName: string;
	groupName: string;
	testName: string;
}

type Selector = Pick<SkipItem, 'testsName' | 'groupName' | 'testName'>;

/**
 * Whether a SkipList/OnlyList entry selects the test. `testsName` is required; `groupName` and
 * `testName` narrow the selection when present, so an entry with only `testsName` selects the whole
 * suite and one with `testsName` and `groupName` selects that group.
 */
function selects(selector: Selector, test: TestIdentity): boolean {
	return (
		selector.testsName === test.testsName &&
		(selector.groupName === undefined || selector.groupName === test.groupName) &&
		(selector.testName === undefined || selector.testName === test.testName)
	);
}

/** How narrowly an entry selects: a test (2) is more specific than a group (1) or a suite (0). */
function specificity(selector: Selector): number {
	return (selector.groupName !== undefined ? 1 : 0) + (selector.testName !== undefined ? 1 : 0);
}

/** The configured SkipList, matched at suite, group or test level. */
export class SkipSelection {
	constructor(private readonly items: readonly SkipItem[]) {}

	/**
	 * The reason a test is skipped, or undefined if no entry selects it. When several entries select
	 * the same test, the most specific one gives the reason (a test entry over its group's entry).
	 */
	reasonFor(test: TestIdentity): string | undefined {
		let match: SkipItem | undefined;
		for (const item of this.items) {
			if (
				selects(item, test) &&
				(match === undefined || specificity(item) > specificity(match))
			) {
				match = item;
			}
		}
		return match === undefined ? undefined : match.reason;
	}
}

/** The configured OnlyList, matched at suite, group or test level. An empty list selects every test. */
export class OnlySelection {
	constructor(private readonly items: readonly OnlyItem[]) {}

	get isEmpty(): boolean {
		return this.items.length === 0;
	}

	includes(test: TestIdentity): boolean {
		return this.isEmpty || this.items.some(item => selects(item, test));
	}
}
