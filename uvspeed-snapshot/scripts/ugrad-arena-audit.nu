# ugrad-arena-audit.nu — verify μgrad HTML shells share baseline wiring (cf. go-ugrad parity shell)
# Run: nu scripts/ugrad-arena-audit.nu

def main [] {
  let web = (pwd | path join "web")
  let files = (glob ($web | path join "*ugrad*.html"))
  mut rows = []
  for p in $files {
    let f = ($p | path basename)
    let raw = (open $p --raw)
    let qp = ($raw | str contains 'quantum-prefixes.js')
    let sw = ($raw | str contains 'serviceWorker.register')
    let hub = ($raw | str contains 'games-ugrad-hub')
    let dbg = ($raw | str contains 'data-ugrad-game')
    mut issues = []
    if not $qp { $issues = ($issues | append "no quantum-prefixes.js") }
    if not $sw { $issues = ($issues | append "no sw.js registration") }
    if not $dbg { $issues = ($issues | append "no data-ugrad-game") }
    $rows = ($rows | append {
      file: $f
      ok: (($issues | length) == 0)
      hub_link: $hub
      issues: ($issues | str join "; ")
    })
  }
  print $"μgrad arena audit — ($web)\n"
  let bad = ($rows | where ok == false)
  let good = ($rows | where ok == true)
  print $"  OK: (($good | length)) / (($rows | length))"
  if ($bad | length) > 0 {
    print "\n  Missing baseline:"
    for r in $bad {
      print $"    ($r.file): ($r.issues)"
    }
  }
  let no_hub = ($rows | where hub_link == false)
  if ($no_hub | length) > 0 {
    print "\n  Optional Hub link (games-ugrad-hub) missing in:"
    for r in $no_hub {
      print $"    ($r.file)"
    }
  }
  print "\n  See docs/ugrad-arena-cli.md for uterm games + tensor hooks."
}
