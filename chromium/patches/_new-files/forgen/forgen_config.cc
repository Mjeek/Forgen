// Copyright (c) Forgen contributors. MIT license.

#include "forgen/forgen_config.h"

#include <fstream>
#include <sstream>

#include "base/command_line.h"
#include "base/files/file_path.h"
#include "base/json/json_reader.h"
#include "base/logging.h"
#include "base/values.h"

namespace forgen {

namespace {

ForgenFingerprint& Instance() {
  static ForgenFingerprint s_instance;
  return s_instance;
}

bool& InstanceActive() {
  static bool s_active = false;
  return s_active;
}

FpMode ParseMode(const std::string& s) {
  if (s == "noise") return FpMode::kNoise;
  if (s == "off") return FpMode::kOff;
  return FpMode::kReal;
}

uint64_t HashProfileId(const std::string& id) {
  // FNV-1a — deterministic, no crypto needed. Used only to seed per-profile
  // pixel noise so two reads of the same canvas return the same value.
  uint64_t h = 1469598103934665603ULL;
  for (char c : id) {
    h ^= static_cast<uint8_t>(c);
    h *= 1099511628211ULL;
  }
  return h;
}

}  // namespace

// static
const ForgenFingerprint& ForgenConfig::Get() {
  return Instance();
}

// static
bool ForgenConfig::IsActive() {
  return InstanceActive();
}

// static
void ForgenConfig::InitializeForTesting(const ForgenFingerprint& fp) {
  Instance() = fp;
  InstanceActive() = true;
}

// static
void ForgenConfig::Initialize() {
  const auto* cmd = base::CommandLine::ForCurrentProcess();
  if (!cmd->HasSwitch("forgen-profile")) return;

  base::FilePath path = cmd->GetSwitchValuePath("forgen-profile");
  std::ifstream f(path.AsUTF8Unsafe());
  if (!f) {
    LOG(WARNING) << "forgen: could not open " << path;
    return;
  }
  std::stringstream buf;
  buf << f.rdbuf();
  auto parsed = base::JSONReader::Read(buf.str());
  if (!parsed || !parsed->is_dict()) {
    LOG(WARNING) << "forgen: malformed JSON at " << path;
    return;
  }
  const base::Value::Dict& root = parsed->GetDict();
  const base::Value::Dict* fp = root.FindDict("fingerprint");
  if (!fp) return;

  ForgenFingerprint out;
  if (const std::string* id = root.FindString("id")) out.profile_id = *id;
  if (const std::string* ua = fp->FindString("userAgent")) out.user_agent = *ua;
  if (const std::string* p = fp->FindString("platform")) {
    if (*p == "windows") out.platform = "Win32";
    else if (*p == "macos") out.platform = "MacIntel";
    else out.platform = "Linux x86_64";
  }
  if (const std::string* v = fp->FindString("vendor")) out.vendor = *v;
  if (const std::string* r = fp->FindString("renderer")) out.renderer = *r;
  if (const std::string* tz = fp->FindString("timezone")) out.timezone = *tz;
  if (const std::string* lang = fp->FindString("language")) out.language = *lang;
  if (auto c = fp->FindInt("cpuCores")) out.cpu_cores = *c;
  if (auto m = fp->FindInt("memoryGb")) out.memory_gb = *m;
  if (auto dnt = fp->FindBool("doNotTrack")) out.do_not_track = *dnt;
  if (const std::string* res = fp->FindString("resolution")) {
    size_t x = res->find('x');
    if (x != std::string::npos) {
      out.screen_width = std::stoi(res->substr(0, x));
      out.screen_height = std::stoi(res->substr(x + 1));
    }
  }
  if (const std::string* m = fp->FindString("canvas")) out.canvas = ParseMode(*m);
  if (const std::string* m = fp->FindString("webgl")) out.webgl = ParseMode(*m);
  if (const std::string* m = fp->FindString("audio")) out.audio = ParseMode(*m);
  if (const std::string* m = fp->FindString("clientRects")) out.client_rects = ParseMode(*m);
  out.noise_seed = HashProfileId(out.profile_id);

  Instance() = out;
  InstanceActive() = true;
}

}  // namespace forgen
