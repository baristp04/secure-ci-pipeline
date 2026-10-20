# Secure CI Pipeline for GitHub Repositories: Haftalık Yol Haritası (Node.js)

## Proje özeti

GitHub repoları için otomatik bir CI güvenlik kapısı (security gate). Her push ve pull request'te secret scanning, SAST ve SCA (bağımlılık) kontrolleri çalışır. Risk bulunursa required status check'ler ve korumalı workflow dosyaları sayesinde merge engellenir.

**Saldırgan:** PR açabilen ama korumalı branch'lere doğrudan yazamayan kötü niyetli veya ele geçirilmiş bir contributor; ya da zararlı paket yayınlayan / üçüncü taraf bağımlılığı veya GitHub Action'ı ele geçiren dış saldırgan.

**Saldırganın hedefi:** `main`'e kalıcı backdoor yerleştirmek, secret (API key, token) çalmak, güvenlik kontrollerini devre dışı bırakıp ya da atlatıp zafiyetli/zararlı paket sokmak.

## Çalışma düzeni

- Her hafta yeni bir saldırı denenir. Açık bulunursa pipeline'a savunma eklenir. Önceki haftaların saldırıları yeniden çalıştırılır (regresyon).
- Repoda `attacks/weekN/` klasörü açılır. Her saldırı bir script veya PR şablonu olarak saklanır.
- Her saldırı `attack-week-N` etiketli bir PR/issue ile açılır. Sonuç (engellendi / geçti) ve alınan önlem orada yazılır. Hoca contributor olarak bunu izleyebilir.
- Hedef uygulama: küçük bir **Express** uygulaması (REST API, birkaç route, bir veri katmanı) ve `package.json` + `package-lock.json`.

## Güvenlik sınırları

- Sadece kendi reponuzda çalışın.
- Secret'lar sahte/canary olsun. Gerçek anahtar kullanmayın.
- Zararlı paket simülasyonlarını **gerçek npm registry'ye yayınlamayın**. Yerel bir registry (Verdaccio) kullanın.
- Beacon/canary yalnızca zararsız bir yerel istek veya log satırı olsun.

## Hafta 1: Kurulum ve baseline

**Saldırı:** `main`'e doğrudan push, onaysız merge, tek başına review'suz PR merge.

**Hazırlık:**
- Express uygulaması, eski sürümlü birkaç bağımlılık ve sahte bir secret içeren örnek kod.
- Temel workflow: `npm ci`, `eslint`, test (Jest veya `node --test`).

**Savunma:**
- Branch ruleset: PR zorunlu, en az 1 review, force push yok.
- `CODEOWNERS` dosyası.
- `npm ci` kullanımı (lockfile'a sadık kurulum).

## Hafta 2: Secret sızdırma

**Saldırı:** PR'a sahte API key/token ekleme. Varyantlar: düz metin, base64, bölünmüş string, `.env` dosyası, eski commit'e gömülü hali, `package.json` script'i içinde.

**Savunma:**
- **Gitleaks** (veya TruffleHog) workflow'da, tüm geçmişi (`fetch-depth: 0`) tarayacak şekilde.
- GitHub **push protection** ve secret scanning.
- `.gitignore` ile `.env` koruması; **husky** + pre-commit hook ile yerel tarama.
- Gitleaks'i required check yapmak.

## Hafta 3: Zafiyetli kod (SAST)

**Saldırı:** PR'lar ile şu desenleri sokmak:
- `eval()`, `new Function()`, `child_process.exec` ile kullanıcı girdisi
- NoSQL/SQL injection (string birleştirme ile sorgu)
- Path traversal (`fs.readFile` + kullanıcı girdisi)
- Prototype pollution (`Object.assign`/`merge` ile kontrolsüz girdi)
- Zayıf kripto (`md5`, sabit IV), hardcoded parola, `Math.random()` ile token
- Bunların gizlenmiş varyantları (dolaylı çağrı, `require` ile dinamik yükleme, string birleştirerek fonksiyon adı üretme)

**Savunma:**
- **CodeQL** (JavaScript/TypeScript)
- **Semgrep** (`p/javascript`, `p/nodejs`, `p/owasp-top-ten` + kendi özel kuralların)
- **eslint-plugin-security** ve **eslint-plugin-no-unsanitized**
- Hepsini required check yapmak.

## Hafta 4: Zafiyetli bağımlılık (SCA)

**Saldırı:** Bilinen CVE'li paket sürümü ekleyen PR. Lockfile'ı elle değiştirme. `package.json`'u değiştirip lockfile'ı güncellememe.

**Savunma:**
- `npm audit --audit-level=high` (CI'da başarısızlık koşulu)
- **OSV-Scanner**
- **dependency-review-action** (PR'da yeni eklenen zafiyetli paketi engeller)
- **Dependabot** (`npm` ekosistemi)
- `package.json` ile `package-lock.json` tutarlılığı kontrolü (`npm ci` zaten uyumsuzlukta hata verir)

## Hafta 5: Güvenlik kontrollerini devre dışı bırakma

**Saldırı:** PR içinde workflow dosyasını değiştirmek:
- Güvenlik job'unu silmek
- `continue-on-error: true` eklemek
- `paths-ignore` / `branches-ignore` ile tetiklenmeyi atlatmak
- Job adını değiştirip required check'i "bekliyor/skipped" durumuna düşürmek
- `if: false` koşulu eklemek

**Savunma:**
- `.github/workflows/` ve güvenlik config dosyaları için **CODEOWNERS** + zorunlu review
- Tüm kontrolleri toplayan tek bir **"gate" job'u** required yapmak (skipped durumu başarı sayılmaz)
- **actionlint** ve **zizmor** ile workflow linting
- Required check'in doğru GitHub App/job ile bağlandığından emin olmak

## Hafta 6: CI üzerinden secret çalma

**Saldırı:**
- `pull_request_target` içinde PR kodunu checkout edip çalıştırma
- PR başlığı, branch adı veya commit mesajı üzerinden **script injection** (`${{ github.event.pull_request.title }}` doğrudan `run:` içinde)
- Secret'ı log'a veya dış bir adrese basma denemesi
- Fork PR'dan secret'a erişme denemesi

**Savunma:**
- Minimum `permissions:` (varsayılan `contents: read`)
- Kullanıcı girdisini `env:` üzerinden geçirme, `run:` içine doğrudan gömmeme
- `pull_request_target` içinde güvenilmeyen kodu çalıştırmama
- Environment + required reviewer, fork PR çalıştırma onayı
- Mümkünse uzun ömürlü secret yerine **OIDC**
- **zizmor** bu sınıf açıkları yakalar

## Hafta 7: Ele geçirilmiş GitHub Action

**Saldırı:** Kendi kontrolünüzdeki sahte bir action'ın tag'ini (`v1`) zararlı bir commit'e taşıyıp workflow'un onu çekmesini simüle etmek.

**Savunma:**
- Action'ları tam **commit SHA**'ya pinleme (**pinact**)
- Dependabot (`github-actions` ekosistemi) ile kontrollü güncelleme
- Repo/org ayarında action **allowlist**
- **step-security/harden-runner** ile runner çıkış (egress) kontrolü
- **OpenSSF Scorecard** ile doğrulama

## Hafta 8: Zararlı npm paketi

**Saldırı (yerel Verdaccio registry'de simüle edilir):**
- **Typosquatting** (`lodash` yerine benzer isim)
- **Dependency confusion** (iç paket adıyla aynı isimde yüksek sürümlü paket)
- **`preinstall`/`postinstall` script'i** ile kurulumda zararsız canary beacon
- Lockfile'daki `resolved` URL'sini saldırgan registry'ye çevirme (**lockfile injection**)

**Savunma:**
- `npm ci --ignore-scripts` (gerekli paketler için açıkça izin verilir)
- **lockfile-lint** (yalnızca izinli host ve https, integrity hash zorunlu)
- Scoped paketler ve `.npmrc` ile tek/doğru registry
- `npm audit signatures` (provenance ve imza doğrulama)
- **Socket** veya benzeri zararlı paket davranış analizi
- **@cyclonedx/cyclonedx-npm** ile SBOM üretimi

## Hafta 9: Kalıcı backdoor

**Saldırı:**
- Birkaç küçük, masum görünen PR'a bölünmüş sinsi değişiklik
- Ele geçirilmiş contributor hesabı simülasyonu
- Gizli workflow, deploy key veya webhook ekleme
- Review sonrası PR'a yeni commit ekleme (onay sonrası değişiklik)

**Savunma:**
- **Signed commit** zorunluluğu
- Yeni commit gelince eski approval'ı düşürme (dismiss stale approvals)
- Admin bypass'ın kapatılması, "last push approval" şartı
- Kritik dosyalarda (workflow, `package.json`, config) zorunlu CODEOWNER review
- Audit log ve deploy key/webhook listesi kontrolü

## Hafta 10: Final red-team

**Saldırı:** Önceki saldırıları zincirleme. Örnek zincir: zafiyetli bağımlılık sok, workflow'daki kontrolü atlat, secret'ı dışarı çıkar. Daha önce görmediğiniz yeni bir varyant da deneyin.

**Savunma ve kapanış:**
- Kalan boşlukları kapatma
- False positive ayarı (kural istisnaları belgelenerek)
- README'de kısa **threat model** ve hangi saldırının hangi kontrolle engellendiğini gösteren tablo
- Tüm `attacks/` senaryolarının son bir kez yeniden çalıştırılması

## Kümülatif savunma özeti

| Katman | Araçlar |
|---|---|
| Secret scanning | Gitleaks, push protection, husky |
| SAST | CodeQL, Semgrep, eslint-plugin-security |
| SCA | npm audit, OSV-Scanner, dependency-review, Dependabot |
| Workflow güvenliği | actionlint, zizmor, pinact, harden-runner |
| Tedarik zinciri | lockfile-lint, `--ignore-scripts`, `npm audit signatures`, SBOM |
| Repo koruması | Ruleset, CODEOWNERS, signed commits, required "gate" check |
