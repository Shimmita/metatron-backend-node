const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "by",
  "for",
  "from",
  "in",
  "of",
  "on",
  "remote",
  "the",
  "to",
  "with",
]);

const ROLE_NOISE = new Set([
  "i",
  "ii",
  "iii",
  "iv",
  "junior",
  "lead",
  "manager",
  "principal",
  "senior",
  "sr",
  "staff",
]);

export const cleanDedupeText = (value = "") =>
  `${value}`
    .toLowerCase()
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/[^a-z0-9+#.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const dedupeTokens = (value = "", { dropRoleNoise = false } = {}) =>
  cleanDedupeText(value)
    .split(" ")
    .filter((token) => token.length > 1)
    .filter((token) => !STOP_WORDS.has(token))
    .filter((token) => !dropRoleNoise || !ROLE_NOISE.has(token));

export const tokenSimilarity = (left = "", right = "", options = {}) => {
  const leftSet = new Set(dedupeTokens(left, options));
  const rightSet = new Set(dedupeTokens(right, options));
  if (!leftSet.size || !rightSet.size) return 0;

  const intersection = [...leftSet].filter((token) => rightSet.has(token)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  return intersection / union;
};

export const canonicalRecordKey = (parts = []) =>
  cleanDedupeText(parts.filter(Boolean).join(" ")).replace(/\s+/g, "-");

export const areCloseJobs = (left, right) => {
  const sameCompany =
    tokenSimilarity(left.organisation?.name || left.company, right.organisation?.name || right.company) >= 0.8;
  if (!sameCompany) return false;

  const titleSimilarity = tokenSimilarity(left.title, right.title, { dropRoleNoise: true });
  const leftLocation = left.location?.country || left.location || left.jobtypeaccess?.access || "";
  const rightLocation = right.location?.country || right.location || right.jobtypeaccess?.access || "";
  const locationSimilarity = tokenSimilarity(leftLocation, rightLocation);

  return titleSimilarity >= 0.72 && (locationSimilarity >= 0.5 || !leftLocation || !rightLocation);
};

export const areCloseEvents = (left, right) => {
  const titleSimilarity = tokenSimilarity(left.title || left.name, right.title || right.name);
  if (titleSimilarity < 0.72) return false;

  const leftDate = left.dateHosted || left.startDate || left.start_at || left.eventDate;
  const rightDate = right.dateHosted || right.startDate || right.start_at || right.eventDate;
  const leftTime = leftDate ? new Date(leftDate).getTime() : 0;
  const rightTime = rightDate ? new Date(rightDate).getTime() : 0;
  const dayMs = 24 * 60 * 60 * 1000;
  const datesClose = leftTime && rightTime ? Math.abs(leftTime - rightTime) <= dayMs : true;

  const locationSimilarity = tokenSimilarity(
    `${left.location?.country || left.country || ""} ${left.location?.state || left.city || left.venue || ""}`,
    `${right.location?.country || right.country || ""} ${right.location?.state || right.city || right.venue || ""}`
  );

  return datesClose && locationSimilarity >= 0.45;
};

export const areCloseCourses = (left, right) => {
  const titleSimilarity = tokenSimilarity(left.course_title || left.title, right.course_title || right.title);
  if (titleSimilarity < 0.72) return false;

  const providerSimilarity = tokenSimilarity(
    left.externalProvider || left.course_instructor?.instructorName || left.provider,
    right.externalProvider || right.course_instructor?.instructorName || right.provider
  );

  const categorySimilarity = tokenSimilarity(
    [
      left.course_category?.main || left.category,
      left.course_category?.sub1,
      left.course_category?.sub2,
      left.course_category?.sub3,
      left.course_category?.sub4,
    ].filter(Boolean).join(" "),
    [
      right.course_category?.main || right.category,
      right.course_category?.sub1,
      right.course_category?.sub2,
      right.course_category?.sub3,
      right.course_category?.sub4,
    ].filter(Boolean).join(" ")
  );

  return providerSimilarity >= 0.55 || categorySimilarity >= 0.55 || titleSimilarity >= 0.88;
};

export const uniqueByCloseness = (records, isClose) => {
  const unique = [];
  for (const record of records) {
    if (!unique.some((existing) => isClose(existing, record))) {
      unique.push(record);
    }
  }
  return unique;
};
