-- CreateTable
CREATE TABLE "HouseholdConfig" (
    "id"          TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "weatherCity" TEXT NOT NULL DEFAULT 'Ottawa',
    "weatherLat"  REAL NOT NULL DEFAULT 45.4215,
    "weatherLng"  REAL NOT NULL DEFAULT -75.6972,
    "countryCode" TEXT NOT NULL DEFAULT 'CA',
    "updatedAt"   DATETIME NOT NULL
);
