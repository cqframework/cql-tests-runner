import { Library } from 'fhir/r4';

/**
 * A library-style test's CQL, published to the server as a FHIR Library resource so that
 * Library/$evaluate can resolve it by canonical url.
 */
export interface PublishedLibrary {
	/** Resource id the library was published under. */
	id: string;
	/** Value for the `url` parameter of Library/$evaluate (canonical, with version when declared). */
	canonical: string;
	/** Removes the published library from the server. Never throws. */
	remove: () => Promise<void>;
}

/**
 * Wraps CQL source as a FHIR Library resource conforming to the CQLLibrary profile in the
 * Using CQL IG: exactly one `content` element whose contentType starts with `text/cql` (clb-1)
 * carrying base-64 encoded data (clb-2), with a name of 64 characters or less (clb-3).
 *
 * Name and version are read from the library declaration so the resource carries the same
 * identity the CQL itself declares (engines resolve and cache libraries by name and version).
 */
export function buildCqlLibraryResource(cql: string): Library {
	const source = cql.trim();
	const declaration =
		/^library\s+("[^"]+"|[A-Za-z_][A-Za-z0-9_.]*)(?:\s+version\s+'([^']*)')?/m.exec(source);

	if (declaration === null) {
		throw new Error('Library-style test CQL has no library declaration');
	}

	const name = declaration[1].replace(/^"|"$/g, '');
	const version = declaration[2];

	if (name.length > 64) {
		throw new Error(
			`Library name '${name}' exceeds the 64 character limit of the CQLLibrary profile`
		);
	}

	return {
		resourceType: 'Library',
		url: `https://hl7.org/fhir/uv/cql/Library/${name}`,
		name,
		...(version !== undefined ? { version } : {}),
		status: 'active',
		type: {
			coding: [
				{
					system: 'http://terminology.hl7.org/CodeSystem/library-type',
					code: 'logic-library',
				},
			],
		},
		content: [
			{
				contentType: 'text/cql',
				data: Buffer.from(source, 'utf8').toString('base64'),
			},
		],
	};
}

/** Derives a valid FHIR id ([A-Za-z0-9\-\.]{1,64}) for the library resource. */
function libraryResourceId(name: string): string {
	return `cql-tests-${name}`.replace(/[^A-Za-z0-9.-]/g, '-').slice(0, 64);
}

/**
 * Publishes a library-style test's CQL to the server so Library/$evaluate can resolve it.
 *
 * Library/$evaluate also defines an inline `library` parameter that takes the Library as a
 * resource, which would avoid this round trip. It is not usable in practice: clinical-reasoning
 * passes only the resource's canonical to the engine (EvaluateProcessor.evaluate) and discards
 * the `content` element, so evaluation fails with "Could not load source for library ...".
 * Publishing first and evaluating by `url` uses the same operation and the same profiled
 * resource, and works today.
 */
export async function publishTestLibrary(baseUrl: string, cql: string): Promise<PublishedLibrary> {
	const library = buildCqlLibraryResource(cql);
	const id = libraryResourceId(library.name!);
	const resourceUrl = `${baseUrl}/Library/${id}`;

	const response = await fetch(resourceUrl, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ ...library, id }),
	});

	if (response.status !== 200 && response.status !== 201) {
		const body = await response.text().catch(() => '');
		throw new Error(
			`Failed to publish library ${library.name} to ${resourceUrl}: ${response.status} ${body}`.trim()
		);
	}

	return {
		id,
		canonical:
			library.version !== undefined ? `${library.url}|${library.version}` : library.url!,
		remove: async () => {
			try {
				await fetch(resourceUrl, { method: 'DELETE' });
			} catch (error: any) {
				// Cleanup failures must not change the outcome of the test.
				console.warn(`Failed to remove published library ${id}: ${error.message}`);
			}
		},
	};
}
