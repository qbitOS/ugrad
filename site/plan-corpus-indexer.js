// beyondBINARY quantum-prefixed | uvspeed | {n, +1, -n, +0, 0, -1, +n, +2, -0, +3, 1}
// [P0d.1] Plan Corpus Indexer — scan, group, classify, delta
// Indexes plan files as DCA-classified training data for the AI growth loop
(function(root) {
    'use strict';

    var VERSION = '1.0.0';
    var QP = root.QuantumPrefixes;

    function stripHash(filename) {
        return filename.replace(/\.plan\.md$/, '').replace(/_[a-f0-9]{8}$/, '');
    }

    function classifyPlan(text) {
        if (!QP || !QP.classifyLine) return { prefixDist: {}, lineCount: 0, classified: 0 };
        var lines = text.split('\n');
        var prefixDist = {};
        var classified = 0;
        lines.forEach(function(line) {
            if (!line.trim()) return;
            var result = QP.classifyLine(line, 'markdown');
            var sym = result.sym || ' ';
            prefixDist[sym] = (prefixDist[sym] || 0) + 1;
            if (sym !== ' ') classified++;
        });
        return { prefixDist: prefixDist, lineCount: lines.length, classified: classified };
    }

    function dominantPrefix(prefixDist) {
        var best = ' ', bestCount = 0;
        Object.keys(prefixDist).forEach(function(sym) {
            if (sym !== ' ' && prefixDist[sym] > bestCount) {
                best = sym; bestCount = prefixDist[sym];
            }
        });
        return best;
    }

    function computeDelta(prev, curr) {
        var prefixShift = {};
        var allSyms = new Set(Object.keys(prev.prefixDist).concat(Object.keys(curr.prefixDist)));
        allSyms.forEach(function(sym) {
            var diff = (curr.prefixDist[sym] || 0) - (prev.prefixDist[sym] || 0);
            if (diff !== 0) prefixShift[sym] = diff;
        });
        return {
            from: prev.file,
            to: curr.file,
            prefixShift: prefixShift,
            linesAdded: Math.max(0, curr.lineCount - prev.lineCount),
            linesRemoved: Math.max(0, prev.lineCount - curr.lineCount),
            classifiedDelta: curr.classified - prev.classified
        };
    }

    function extractBlocks(text) {
        var blocks = [];
        var re = /<!--\s*BLOCK:(.*?)-->/g;
        var m;
        while ((m = re.exec(text)) !== null) {
            var attrs = {};
            m[1].split('|').forEach(function(pair) {
                var eq = pair.indexOf('=');
                if (eq > 0) attrs[pair.substring(0, eq).trim()] = pair.substring(eq + 1).trim();
            });
            blocks.push(attrs);
        }
        return blocks;
    }

    function extractSections(text) {
        var sections = [];
        var lines = text.split('\n');
        var current = null;
        for (var i = 0; i < lines.length; i++) {
            var hm = lines[i].match(/^(#{1,4})\s+(.*)/);
            if (hm) {
                if (current) { current.endLine = i - 1; sections.push(current); }
                var addrMatch = hm[2].match(/\[P[\d.a-z]+\]/);
                current = {
                    level: hm[1].length,
                    title: hm[2],
                    address: addrMatch ? addrMatch[0] : null,
                    startLine: i,
                    endLine: i
                };
            }
        }
        if (current) { current.endLine = lines.length - 1; sections.push(current); }
        return sections;
    }

    function indexPlans(files) {
        var categories = {};
        files.forEach(function(f) {
            var cat = stripHash(f.name);
            if (!categories[cat]) categories[cat] = [];
            var cls = classifyPlan(f.text);
            categories[cat].push({
                file: f.name,
                size: f.text.length,
                lineCount: cls.lineCount,
                classified: cls.classified,
                prefixDist: cls.prefixDist,
                dominantPrefix: dominantPrefix(cls.prefixDist),
                blocks: extractBlocks(f.text),
                sections: extractSections(f.text),
                modTime: f.modTime || Date.now()
            });
        });

        Object.keys(categories).forEach(function(cat) {
            categories[cat].sort(function(a, b) { return a.modTime - b.modTime; });
        });

        var index = {
            version: VERSION,
            generatedAt: new Date().toISOString(),
            totalPlans: files.length,
            totalCategories: Object.keys(categories).length,
            categories: {}
        };

        var globalPrefixDist = {};
        var totalLines = 0;
        var totalClassified = 0;

        Object.keys(categories).sort().forEach(function(cat) {
            var versions = categories[cat];
            var deltas = [];
            for (var i = 1; i < versions.length; i++) {
                deltas.push(computeDelta(versions[i - 1], versions[i]));
            }

            versions.forEach(function(v) {
                totalLines += v.lineCount;
                totalClassified += v.classified;
                Object.keys(v.prefixDist).forEach(function(sym) {
                    globalPrefixDist[sym] = (globalPrefixDist[sym] || 0) + v.prefixDist[sym];
                });
            });

            index.categories[cat] = {
                versions: versions.map(function(v) {
                    return { file: v.file, prefixDist: v.prefixDist, lineCount: v.lineCount, classified: v.classified, size: v.size, dominantPrefix: v.dominantPrefix };
                }),
                deltas: deltas,
                iterationCount: versions.length,
                latestVersion: versions[versions.length - 1].file
            };
        });

        index.globalStats = {
            totalLines: totalLines,
            totalClassified: totalClassified,
            coveragePercent: totalLines > 0 ? Math.round(totalClassified / totalLines * 100) : 0,
            prefixDistribution: globalPrefixDist,
            dominantPrefix: dominantPrefix(globalPrefixDist),
            topCategories: Object.keys(categories).sort(function(a, b) {
                return categories[b].length - categories[a].length;
            }).slice(0, 10).map(function(cat) {
                return { name: cat, versions: categories[cat].length };
            })
        };

        return index;
    }

    function indexFromFileList(fileInput) {
        return new Promise(function(resolve) {
            var files = Array.from(fileInput.files || []);
            var results = [];
            var pending = files.length;
            if (!pending) { resolve(indexPlans([])); return; }
            files.forEach(function(file) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    results.push({ name: file.name, text: e.target.result, modTime: file.lastModified });
                    if (--pending === 0) resolve(indexPlans(results));
                };
                reader.readAsText(file);
            });
        });
    }

    function diffPlans(textA, textB, nameA, nameB) {
        var secA = extractSections(textA);
        var secB = extractSections(textB);
        var clsA = classifyPlan(textA);
        var clsB = classifyPlan(textB);

        var addrMapA = {}, addrMapB = {};
        secA.forEach(function(s) { if (s.address) addrMapA[s.address] = s; });
        secB.forEach(function(s) { if (s.address) addrMapB[s.address] = s; });
        var allAddrs = Object.keys(addrMapA).concat(Object.keys(addrMapB));
        var uniqueAddrs = [];
        var seen = {};
        allAddrs.forEach(function(a) { if (!seen[a]) { seen[a] = true; uniqueAddrs.push(a); } });
        uniqueAddrs.sort();

        var added = [], removed = [], changed = [], unchanged = [];
        uniqueAddrs.forEach(function(addr) {
            var a = addrMapA[addr], b = addrMapB[addr];
            if (a && !b) { removed.push({ address: addr, section: a }); }
            else if (b && !a) { added.push({ address: addr, section: b }); }
            else {
                var prefixA = QP ? QP.classifyLine(a.title, 'markdown').sym : ' ';
                var prefixB = QP ? QP.classifyLine(b.title, 'markdown').sym : ' ';
                if (prefixA !== prefixB || a.title !== b.title) {
                    changed.push({ address: addr, from: a, to: b, prefixFrom: prefixA, prefixTo: prefixB });
                } else {
                    unchanged.push({ address: addr });
                }
            }
        });

        return {
            fileA: nameA || 'v1',
            fileB: nameB || 'v2',
            sectionsA: secA.length,
            sectionsB: secB.length,
            linesA: clsA.lineCount,
            linesB: clsB.lineCount,
            prefixDeltaGlobal: computeDelta(clsA, clsB),
            added: added,
            removed: removed,
            changed: changed,
            unchanged: unchanged,
            summary: {
                added: added.length,
                removed: removed.length,
                changed: changed.length,
                unchanged: unchanged.length,
                total: uniqueAddrs.length
            }
        };
    }

    function renderDiffHTML(diff) {
        var prefixColors = {'n:':'#a78bfa','+1:':'#3fb950','-n:':'#58a6ff','+0:':'#f0883e',
            '0:':'#8b949e','-1:':'#f85149','+n:':'#fbbf24','+2:':'#22d3ee',
            '-0:':'#c084fc','+3:':'#ec4899','1:':'#e6edf3',' ':'#484f58'};
        var html = '<div style="font-family:\'SF Mono\',monospace;font-size:.625rem;">';
        html += '<div style="padding:6px;background:#161b22;border:1px solid #30363d;border-radius:6px;margin-bottom:8px;">';
        html += '<b>' + (diff.fileA || 'v1') + '</b> → <b>' + (diff.fileB || 'v2') + '</b> | ';
        html += diff.sectionsA + '→' + diff.sectionsB + ' sections | ';
        html += diff.linesA + '→' + diff.linesB + ' lines | ';
        html += '<span style="color:#3fb950;">+' + diff.summary.added + '</span> ';
        html += '<span style="color:#f85149;">-' + diff.summary.removed + '</span> ';
        html += '<span style="color:#fbbf24;">~' + diff.summary.changed + '</span>';
        html += '</div>';

        diff.added.forEach(function(a) {
            html += '<div style="padding:3px 6px;border-left:3px solid #3fb950;margin:2px 0;background:#0d1117;">';
            html += '<span style="color:#3fb950;">+ ' + a.address + '</span> ' + (a.section.title || '').substring(0, 60);
            html += '</div>';
        });
        diff.removed.forEach(function(r) {
            html += '<div style="padding:3px 6px;border-left:3px solid #f85149;margin:2px 0;background:#0d1117;">';
            html += '<span style="color:#f85149;">- ' + r.address + '</span> ' + (r.section.title || '').substring(0, 60);
            html += '</div>';
        });
        diff.changed.forEach(function(c) {
            var colA = prefixColors[c.prefixFrom] || '#484f58';
            var colB = prefixColors[c.prefixTo] || '#484f58';
            html += '<div style="padding:3px 6px;border-left:3px solid #fbbf24;margin:2px 0;background:#0d1117;">';
            html += '<span style="color:#fbbf24;">~ ' + c.address + '</span> ';
            html += '<span style="color:' + colA + ';">' + c.prefixFrom + '</span>→<span style="color:' + colB + ';">' + c.prefixTo + '</span> ';
            html += (c.to.title || '').substring(0, 50);
            html += '</div>';
        });
        html += '</div>';
        return html;
    }

    var PlanCorpusIndexer = {
        VERSION: VERSION,
        indexPlans: indexPlans,
        indexFromFileList: indexFromFileList,
        classifyPlan: classifyPlan,
        extractBlocks: extractBlocks,
        extractSections: extractSections,
        stripHash: stripHash,
        dominantPrefix: dominantPrefix,
        computeDelta: computeDelta,
        diffPlans: diffPlans,
        renderDiffHTML: renderDiffHTML
    };

    root.PlanCorpusIndexer = PlanCorpusIndexer;

    if (typeof BroadcastChannel !== 'undefined') {
        try {
            var bc = new BroadcastChannel('plan-corpus');
            bc.postMessage({ type: 'indexer-ready', version: VERSION });
        } catch(e) {}
    }

})(typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : this);
