//! Game version handling for version-specific RNG implementations.
//!
//! Stardew Valley's RNG changed significantly across versions.
//! This module provides a type-safe way to handle version differences.

/// Represents a Stardew Valley game version.
///
/// Each version may have different RNG algorithms, seeding methods,
/// and game mechanics that affect predictions.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord)]
pub enum GameVersion {
    /// Version 1.3 - Uses legacy simple addition seeding
    V1_3,
    /// Version 1.4 - Introduced hash-based seeding (XXHash)
    V1_4,
    /// Version 1.5 - Added Ginger Island, Qi challenges
    V1_5,
    /// Version 1.6 - Major overhaul: green rain, new cart system, etc.
    #[default]
    V1_6,
}

impl GameVersion {
    /// Parse a version string like "1.5" or "1.6.4" into a GameVersion.
    /// Defaults to V1_6 for unrecognized versions.
    pub fn parse(s: &str) -> Self {
        let parts: Vec<u32> = s
            .split('.')
            .filter_map(|p| p.parse().ok())
            .collect();

        match parts.first() {
            Some(1) => match parts.get(1) {
                Some(3) => Self::V1_3,
                Some(4) => Self::V1_4,
                Some(5) => Self::V1_5,
                _ => Self::V1_6, // Default to latest for 1.6+
            },
            _ => Self::V1_6, // Default to latest
        }
    }

    /// Returns true if this version uses legacy (pre-1.4) RNG seeding.
    /// Legacy seeding uses simple modular addition.
    /// Modern seeding (1.4+) uses XXHash.
    #[inline]
    pub fn uses_legacy_random(&self) -> bool {
        matches!(self, Self::V1_3)
    }

    /// Returns true if this version has hash-based seeding (1.4+).
    #[inline]
    pub fn uses_hash_seeding(&self) -> bool {
        !self.uses_legacy_random()
    }

    /// Returns true if this version has Ginger Island content (1.5+).
    #[inline]
    pub fn has_ginger_isle(&self) -> bool {
        matches!(self, Self::V1_5 | Self::V1_6)
    }

    /// Returns true if this version has green rain weather (1.6+).
    #[inline]
    pub fn has_green_rain(&self) -> bool {
        matches!(self, Self::V1_6)
    }

    /// Returns true if this version uses the new Data/Shops cart system (1.6+).
    #[inline]
    pub fn has_new_cart_system(&self) -> bool {
        matches!(self, Self::V1_6)
    }

    /// Returns true if this version has the night event priming behavior (1.4+).
    /// In 1.4+, night events have additional RNG priming.
    #[inline]
    pub fn has_primed_night_events(&self) -> bool {
        !matches!(self, Self::V1_3)
    }

    /// Returns true if this version has the windstorm night event (1.6+).
    #[inline]
    pub fn has_windstorm_event(&self) -> bool {
        matches!(self, Self::V1_6)
    }

    /// Returns true if this version uses level*100 for mine floor seeding (1.4+).
    #[inline]
    pub fn uses_mine_level_multiplier(&self) -> bool {
        !matches!(self, Self::V1_3)
    }

    /// Returns true if this version has geode warmup loops (1.4+).
    #[inline]
    pub fn has_geode_warmup(&self) -> bool {
        !matches!(self, Self::V1_3)
    }

    /// Returns true if this version has the Qi bean check in geodes (1.5+).
    #[inline]
    pub fn has_qi_bean_check(&self) -> bool {
        matches!(self, Self::V1_5 | Self::V1_6)
    }

    /// Returns true if 1.6 reversed the geode mineral/ore check.
    #[inline]
    pub fn has_reversed_geode_check(&self) -> bool {
        matches!(self, Self::V1_6)
    }
}

impl std::fmt::Display for GameVersion {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::V1_3 => write!(f, "1.3"),
            Self::V1_4 => write!(f, "1.4"),
            Self::V1_5 => write!(f, "1.5"),
            Self::V1_6 => write!(f, "1.6"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version_parsing() {
        assert_eq!(GameVersion::parse("1.3"), GameVersion::V1_3);
        assert_eq!(GameVersion::parse("1.4"), GameVersion::V1_4);
        assert_eq!(GameVersion::parse("1.5"), GameVersion::V1_5);
        assert_eq!(GameVersion::parse("1.5.6"), GameVersion::V1_5);
        assert_eq!(GameVersion::parse("1.6"), GameVersion::V1_6);
        assert_eq!(GameVersion::parse("1.6.4"), GameVersion::V1_6);
        assert_eq!(GameVersion::parse("1.7"), GameVersion::V1_6); // Future versions default to latest
        assert_eq!(GameVersion::parse("invalid"), GameVersion::V1_6);
    }

    #[test]
    fn test_version_features() {
        // 1.3
        assert!(GameVersion::V1_3.uses_legacy_random());
        assert!(!GameVersion::V1_3.has_ginger_isle());
        assert!(!GameVersion::V1_3.has_green_rain());

        // 1.4
        assert!(!GameVersion::V1_4.uses_legacy_random());
        assert!(GameVersion::V1_4.uses_hash_seeding());
        assert!(!GameVersion::V1_4.has_ginger_isle());

        // 1.5
        assert!(GameVersion::V1_5.has_ginger_isle());
        assert!(GameVersion::V1_5.has_qi_bean_check());
        assert!(!GameVersion::V1_5.has_green_rain());

        // 1.6
        assert!(GameVersion::V1_6.has_green_rain());
        assert!(GameVersion::V1_6.has_new_cart_system());
        assert!(GameVersion::V1_6.has_windstorm_event());
        assert!(GameVersion::V1_6.has_reversed_geode_check());
    }

    #[test]
    fn test_version_ordering() {
        assert!(GameVersion::V1_3 < GameVersion::V1_4);
        assert!(GameVersion::V1_4 < GameVersion::V1_5);
        assert!(GameVersion::V1_5 < GameVersion::V1_6);
    }
}
