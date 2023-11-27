/*!
 * Copyright © 2023 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

export class UnexpectedResolveError extends Error {}

export async function neverResolve<T>(promise: Promise<T>) {
  await promise
  throw new UnexpectedResolveError('promise resolved unexpectedly')
}
