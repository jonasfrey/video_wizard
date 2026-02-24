// Copyright (C) [2026] [Jonas Immanuel Frey] - Licensed under GPLv2. See LICENSE file for details.

import { assertEquals } from "jsr:@std/assert";

Deno.test("simple sanity check", () => {
    let n_result = 1 + 2;
    assertEquals(n_result, 3);
});
