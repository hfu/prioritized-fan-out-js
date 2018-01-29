const fs = require('fs-extra')
const Database = require('better-sqlite3')
const zlib = require('zlib')

const v2q = function(v) {
  for(let i = 0; true; i++) {
    if(v / (2 ** i) < 1) return i - 1
  }
}

const report = function (c, count, path) {
  if (c === count || c % 1000 === 0) {
    console.log(`${c} of ${count} (${Math.round(c * 100.0 / count)}%) ${path}`)
  }
}

const run = function (mbtiles, dir) {
  const db = new Database(mbtiles, {readonly: true})
  const count = db.prepare('SELECT count(*) FROM tiles').get()['count(*)']
  let c = 0
  for (let z = 0; z <= 24; z++) {
    for (const r of db.prepare(`SELECT * FROM tiles WHERE zoom_level == ${z}`).iterate()) {
      const buf = zlib.unzipSync(r.tile_data)
      const q = v2q(buf.length)
      const z = r.zoom_level
      const x = r.tile_column
      const y = (1 << z) - r.tile_row - 1
      if(q > 8) {
        fs.mkdirsSync(`${dir}/${z}/${x}`)
        fs.writeFileSync(`${dir}/${z}/${x}/${y}.pbf`, buf)
      }
      report(++c, count, `${dir}/${z}/${x}/${y}.pbf`)
    }
  }
  db.close()
}

if (process.argv.length === 4) {
  run(process.argv[2], process.argv[3])
} else {
  console.log('usage: node fan-out {tiles.mbtiles} {tiles_dir}')
}
