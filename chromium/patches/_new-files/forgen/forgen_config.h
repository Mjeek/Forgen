// Copyright (c) Forgen contributors. MIT license.
//
// ForgenConfig is a process-singleton that owns the per-profile fingerprint
// configuration loaded from the JSON file passed via `--forgen-profile`.
// Every Blink override site consults this singleton rather than reading
// platform defaults. The singleton is populated once per browser process
// during content::ContentMainRunnerImpl init (see the loader patch).
//
// Keep this header dependency-light — it is included from many Blink sources.

#ifndef FORGEN_FORGEN_CONFIG_H_
#define FORGEN_FORGEN_CONFIG_H_

#include <cstdint>
#include <string>
#include <vector>

namespace forgen {

enum class FpMode { kOff, kReal, kNoise };

struct ForgenFingerprint {
  std::string profile_id;
  std::string user_agent;
  std::string platform;          // "Win32" / "MacIntel" / "Linux x86_64"
  std::string vendor;
  std::string renderer;
  std::string timezone;          // empty or "auto" means use system default
  std::string language;          // empty or "auto" means use system default
  int cpu_cores = 8;
  int memory_gb = 8;
  int screen_width = 1920;
  int screen_height = 1080;
  FpMode canvas = FpMode::kReal;
  FpMode webgl = FpMode::kReal;
  FpMode audio = FpMode::kReal;
  FpMode client_rects = FpMode::kReal;
  bool do_not_track = false;
  // 64-bit seed derived from profile_id, used for deterministic per-profile
  // pixel / audio noise so tests from the same profile match across runs.
  uint64_t noise_seed = 0;
};

class ForgenConfig {
 public:
  // Returns the populated singleton. If --forgen-profile was not passed (or
  // parsing failed), returns a default-constructed instance where every
  // FpMode is kOff / platform fields are empty — at which point every
  // override site no-ops and behaves like upstream Chromium.
  static const ForgenFingerprint& Get();

  // Called once during process init, after command-line parsing. Safe to
  // call a second time for tests. Not thread-safe — init happens before any
  // renderer thread starts.
  static void Initialize();
  static void InitializeForTesting(const ForgenFingerprint& fp);

  // True if Initialize() found a profile JSON and loaded it.
  static bool IsActive();
};

}  // namespace forgen

#endif  // FORGEN_FORGEN_CONFIG_H_
