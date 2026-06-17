/* wifye_parser.c — Fast 802.11 pcap/pcapng parser
 * Reads pcap/pcapng files and outputs a JSON array of parsed 802.11 frames.
 * Usage: ./parser <file.pcap>
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

/* ── pcap magic numbers ───────────────────────────────────────── */
#define PCAP_MAGIC_LE    0xa1b2c3d4u
#define PCAP_MAGIC_NS_LE 0xa1b23c4du
#define PCAP_MAGIC_BE    0xd4c3b2a1u
#define PCAP_MAGIC_NS_BE 0x4d3cb2a1u
#define PCAPNG_SHB_TYPE  0x0a0d0d0au
#define PCAPNG_IDB_TYPE  0x00000001u
#define PCAPNG_EPB_TYPE  0x00000006u

/* ── Link types ───────────────────────────────────────────────── */
#define LINKTYPE_IEEE802_11          105
#define LINKTYPE_IEEE802_11_RADIOTAP 127

/* ── 802.11 frame types/subtypes ──────────────────────────────── */
#define DOT11_TYPE_MGMT 0
#define DOT11_TYPE_DATA 2

#define DOT11_SUB_ASSOC_REQ   0
#define DOT11_SUB_ASSOC_RESP  1
#define DOT11_SUB_REASSOC_REQ 2
#define DOT11_SUB_PROBE_REQ   4
#define DOT11_SUB_PROBE_RESP  5
#define DOT11_SUB_BEACON      8
#define DOT11_SUB_DEAUTH      12
#define DOT11_SUB_DISASSOC    10

/* ── RadioTap presence bits ───────────────────────────────────── */
#define RT_TSFT       (1u<<0)
#define RT_FLAGS      (1u<<1)
#define RT_RATE       (1u<<2)
#define RT_CHANNEL    (1u<<3)
#define RT_FHSS       (1u<<4)
#define RT_DBM_SIGNAL (1u<<5)

/* ── Globals ──────────────────────────────────────────────────── */
static int      first_frame = 1;
static uint64_t total_pkts  = 0;

/* ── JSON helpers ─────────────────────────────────────────────── */
static void json_str(const char *s) {
    putchar('"');
    for (; *s; s++) {
        unsigned char c = (unsigned char)*s;
        if      (c == '"')  fputs("\\\"", stdout);
        else if (c == '\\') fputs("\\\\", stdout);
        else if (c < 0x20)  printf("\\u%04x", c);
        else                 putchar(c);
    }
    putchar('"');
}

static void mac_to_str(char out[18], const uint8_t *m) {
    snprintf(out, 18, "%02X:%02X:%02X:%02X:%02X:%02X",
             m[0], m[1], m[2], m[3], m[4], m[5]);
}

static int is_zero_mac(const uint8_t *m) {
    return !m[0] && !m[1] && !m[2] && !m[3] && !m[4] && !m[5];
}
static int is_bcast_mac(const uint8_t *m) {
    return m[0]==0xff && m[1]==0xff && m[2]==0xff && m[3]==0xff && m[4]==0xff && m[5]==0xff;
}
static int is_mcast_mac(const uint8_t *m) { return (m[0] & 0x01) != 0; }

/* ── RadioTap parser ──────────────────────────────────────────── */
static int parse_radiotap(const uint8_t *d, int dlen, int *rt_end) {
    if (dlen < 8) { *rt_end = dlen; return -999; }
    uint16_t rt_len = (uint16_t)(d[2] | (d[3]<<8));
    if (rt_len > (uint16_t)dlen) rt_len = (uint16_t)dlen;
    *rt_end = rt_len;

    uint32_t present = (uint32_t)(d[4]|(d[5]<<8)|(d[6]<<16)|(d[7]<<24));
    int off = 8;

    /* Skip any extended presence words */
    while ((present & (1u<<31)) && off+4 <= rt_len) {
        off += 4;
    }

    if (present & RT_TSFT)    { off = (off+7)&~7; off += 8; }
    if (present & RT_FLAGS)   { off += 1; }
    if (present & RT_RATE)    { off += 1; }
    if (present & RT_CHANNEL) { off = (off+1)&~1; off += 4; }
    if (present & RT_FHSS)    { off += 2; }
    if ((present & RT_DBM_SIGNAL) && off < rt_len)
        return (int)(int8_t)d[off];
    return -999;
}

/* ── IE parser ────────────────────────────────────────────────── */
typedef struct {
    char   ssid[256];
    int    channel;
    int    has_ht, has_vht, has_wps, has_rsn, has_wpa_ie, has_wpa3;
    double rates[64];
    int    rate_count;
} IEInfo;

static void parse_ies(const uint8_t *d, int len, IEInfo *ie) {
    int off = 0;
    while (off+2 <= len) {
        uint8_t id   = d[off];
        uint8_t elen = d[off+1];
        off += 2;
        if (off+elen > len) break;
        const uint8_t *v = d+off;

        if (id == 0) {
            int sl = elen < 255 ? elen : 255;
            memcpy(ie->ssid, v, sl);
            ie->ssid[sl] = '\0';
        } else if (id == 1 || id == 50) {
            for (int i = 0; i < elen && ie->rate_count < 64; i++)
                ie->rates[ie->rate_count++] = (v[i] & 0x7F) * 0.5;
        } else if (id == 3 && elen >= 1) {
            ie->channel = v[0];
        } else if (id == 45) {
            ie->has_ht = 1;
        } else if (id == 48) {
            ie->has_rsn = 1;
            /* Scan AKM suites for WPA3 (SAE = \x00\x0f\xac\x08) */
            if (elen >= 8) {
                int ro = 2+4;
                if (ro+2 <= elen) {
                    uint16_t pc = (uint16_t)(v[ro]|(v[ro+1]<<8));
                    ro += 2+pc*4;
                    if (ro+2 <= elen) {
                        uint16_t ac = (uint16_t)(v[ro]|(v[ro+1]<<8));
                        ro += 2;
                        for (int a = 0; a < ac && ro+4 <= elen; a++, ro += 4) {
                            if (v[ro]==0&&v[ro+1]==0x0f&&v[ro+2]==0xac&&v[ro+3]==8)
                                ie->has_wpa3 = 1;
                        }
                    }
                }
            }
        } else if (id == 191) {
            ie->has_vht = 1;
        } else if (id == 221 && elen >= 4) {
            if (v[0]==0&&v[1]==0x50&&v[2]==0xf2&&v[3]==1)  ie->has_wpa_ie = 1;
            if (v[0]==0&&v[1]==0x50&&v[2]==0xf2&&v[3]==4)  ie->has_wps    = 1;
        }
        off += elen;
    }
}

/* ── Frame output ─────────────────────────────────────────────── */
static void emit_frame(const char *type, double ts, int sig,
                       const uint8_t *bssid, const uint8_t *client,
                       const IEInfo *ie, int cap) {
    char bs[18], cs[18];
    if (bssid)  mac_to_str(bs, bssid);
    if (client) mac_to_str(cs, client);

    if (!first_frame) printf(",\n"); else first_frame = 0;

    printf("{\"type\":"); json_str(type);
    if (ts > 0)    printf(",\"ts\":%.6f", ts);
    if (sig != -999) printf(",\"sig\":%d", sig);
    if (bssid && !is_zero_mac(bssid))
        printf(",\"bssid\":\"%s\"", bs);
    if (client && !is_zero_mac(client) && !is_bcast_mac(client))
        printf(",\"client\":\"%s\"", cs);

    if (ie) {
        if (ie->ssid[0]) { printf(",\"ssid\":"); json_str(ie->ssid); }
        if (ie->channel)  printf(",\"ch\":%d", ie->channel);
        if (ie->has_ht)   printf(",\"ht\":1");
        if (ie->has_vht)  printf(",\"vht\":1");
        if (ie->has_wps)  printf(",\"wps\":1");

        const char *enc = "Open";
        if      (ie->has_wpa3)   enc = "WPA3";
        else if (ie->has_rsn)    enc = "WPA2";
        else if (ie->has_wpa_ie) enc = "WPA";
        else if (cap & 0x10)     enc = "WEP";
        printf(",\"enc\":"); json_str(enc);

        if (ie->rate_count > 0) {
            printf(",\"rates\":[");
            for (int i = 0; i < ie->rate_count; i++) {
                if (i) putchar(',');
                printf("%.1f", ie->rates[i]);
            }
            putchar(']');
        }
    }
    putchar('}');
}

/* ── 802.11 frame parser ──────────────────────────────────────── */
static void parse_dot11(const uint8_t *fr, int flen, double ts, int sig) {
    if (flen < 10) return;

    uint16_t fc      = (uint16_t)(fr[0]|(fr[1]<<8));
    int prot         = fc & 3;
    int type         = (fc>>2) & 3;
    int subtype      = (fc>>4) & 0xf;
    if (prot) return;
    if (flen < 24) return;

    const uint8_t *addr1 = fr+4;
    const uint8_t *addr2 = fr+10;
    const uint8_t *addr3 = fr+16;

    if (type == DOT11_TYPE_MGMT) {
        if (subtype == DOT11_SUB_BEACON || subtype == DOT11_SUB_PROBE_RESP) {
            if (flen < 36) return;   /* 24 hdr + 12 fixed params */
            int cap = (int)(fr[32]|(fr[33]<<8));
            IEInfo ie; memset(&ie,0,sizeof(ie));
            parse_ies(fr+36, flen-36, &ie);
            emit_frame(subtype==DOT11_SUB_BEACON?"beacon":"probe_resp",
                       ts, sig, addr3, NULL, &ie, cap);

        } else if (subtype == DOT11_SUB_PROBE_REQ) {
            IEInfo ie; memset(&ie,0,sizeof(ie));
            parse_ies(fr+24, flen-24, &ie);
            emit_frame("probe_req", ts, sig, NULL, addr2, &ie, 0);

        } else if (subtype == DOT11_SUB_ASSOC_REQ ||
                   subtype == DOT11_SUB_REASSOC_REQ) {
            int fp = (subtype == DOT11_SUB_REASSOC_REQ) ? 10 : 4;
            if (flen < 24+fp) return;
            IEInfo ie; memset(&ie,0,sizeof(ie));
            parse_ies(fr+24+fp, flen-24-fp, &ie);
            /* addr1=BSSID(dest), addr2=client(src) */
            emit_frame("assoc_req", ts, sig, addr1, addr2, &ie, 0);

        } else if (subtype == DOT11_SUB_DEAUTH ||
                   subtype == DOT11_SUB_DISASSOC) {
            /* addr2 = sender (who sent the deauth) */
            emit_frame(subtype==DOT11_SUB_DEAUTH?"deauth":"disassoc",
                       ts, sig, NULL, addr2, NULL, 0);
        }

    } else if (type == DOT11_TYPE_DATA) {
        int to_ds   = (fr[1]>>0) & 1;
        int from_ds = (fr[1]>>1) & 1;

        const uint8_t *client_mac = NULL, *bssid_mac = NULL;
        if (to_ds && !from_ds) {
            client_mac = addr2; bssid_mac = addr1;
        } else if (from_ds && !to_ds) {
            client_mac = addr1; bssid_mac = addr2;
        } else return;

        if (!client_mac || !bssid_mac) return;
        if (is_bcast_mac(client_mac) || is_mcast_mac(client_mac)) return;
        if (is_zero_mac(client_mac)) return;

        int qos    = (subtype & 8) != 0;
        int hdr_off = 24 + (qos ? 2 : 0);

        /* EAPOL detection: LLC/SNAP header + EtherType 0x888E */
        if (flen >= hdr_off+8) {
            const uint8_t *llc = fr+hdr_off;
            if (llc[0]==0xAA && llc[1]==0xAA && llc[2]==0x03 &&
                llc[6]==0x88 && llc[7]==0x8E) {
                emit_frame("eapol", ts, sig, bssid_mac, client_mac, NULL, 0);
            }
        }
    }
}

/* ── LE/BE helpers ────────────────────────────────────────────── */
static uint32_t u32le(const uint8_t *p) {
    return (uint32_t)(p[0]|(p[1]<<8)|(p[2]<<16)|(p[3]<<24));
}
static uint32_t u32be(const uint8_t *p) {
    return ((uint32_t)p[0]<<24)|((uint32_t)p[1]<<16)|((uint32_t)p[2]<<8)|p[3];
}

/* ── pcap reader ──────────────────────────────────────────────── */
static void read_pcap(FILE *fp, uint32_t magic) {
    int swap = (magic == PCAP_MAGIC_BE || magic == PCAP_MAGIC_NS_BE);
    int nsec = (magic == PCAP_MAGIC_NS_LE || magic == PCAP_MAGIC_NS_BE);

    uint8_t gh[20];
    if (fread(gh,1,20,fp) != 20) return;
    uint32_t link_type = swap ? u32be(gh+16) : u32le(gh+16);

    if (link_type != LINKTYPE_IEEE802_11_RADIOTAP &&
        link_type != LINKTYPE_IEEE802_11) {
        fprintf(stderr, "Note: link type %u is not 802.11; no frames parsed\n", link_type);
        return;
    }

    uint8_t ph[16];
    uint8_t *buf = NULL; size_t bufsz = 0;

    while (fread(ph,1,16,fp) == 16) {
        uint32_t ts_sec  = swap ? u32be(ph)   : u32le(ph);
        uint32_t ts_sub  = swap ? u32be(ph+4) : u32le(ph+4);
        uint32_t inc_len = swap ? u32be(ph+8) : u32le(ph+8);
        (void)(swap ? u32be(ph+12) : u32le(ph+12));  /* orig_len */

        if (inc_len > 65536) break;
        if (inc_len > bufsz) {
            buf = realloc(buf, inc_len+16);
            if (!buf) break;
            bufsz = inc_len+16;
        }
        if (fread(buf,1,inc_len,fp) != inc_len) break;
        total_pkts++;

        double ts = (double)ts_sec + (nsec ? ts_sub*1e-9 : ts_sub*1e-6);
        const uint8_t *frame = buf;
        int flen = (int)inc_len;
        int sig  = -999;

        if (link_type == LINKTYPE_IEEE802_11_RADIOTAP) {
            int rt_end = 0;
            sig = parse_radiotap(frame, flen, &rt_end);
            frame += rt_end; flen -= rt_end;
        }
        if (flen >= 2) parse_dot11(frame, flen, ts, sig);
    }
    free(buf);
}

/* ── pcapng reader ────────────────────────────────────────────── */
static void read_pcapng(FILE *fp) {
    /* Block type (0x0A0D0D0A) already consumed. Read total_len + SHB body. */
    uint8_t buf4[4];
    if (fread(buf4,1,4,fp) != 4) return;
    uint32_t shb_total = u32le(buf4);   /* assume LE until BOM read */

    uint8_t shb12[12];
    if (fread(shb12,1,12,fp) != 12) return;

    uint32_t bom_le = u32le(shb12);     /* byte order magic */
    int swap = 0;
    if      (bom_le == 0x1A2B3C4Du) swap = 0;
    else if (bom_le == 0x4D3C2B1Au) swap = 1;
    else return;

    /* Skip remainder of SHB */
    long skip = (long)shb_total - 4 - 4 - 12 - 4;
    if (skip > 0) fseek(fp, skip, SEEK_CUR);

    int link_type = LINKTYPE_IEEE802_11_RADIOTAP;
    uint8_t *blk  = NULL; size_t blksz = 0;
    uint8_t  hdr8[8];

    while (fread(hdr8,1,8,fp) == 8) {
        uint32_t btype  = swap ? u32be(hdr8)   : u32le(hdr8);
        uint32_t btotal = swap ? u32be(hdr8+4) : u32le(hdr8+4);

        if (btotal < 12 || btotal > 0x2000000u) break;
        uint32_t body_len = btotal - 12;

        if (body_len > blksz) {
            blk = realloc(blk, body_len+4);
            if (!blk) break;
            blksz = body_len+4;
        }
        if (body_len > 0 && fread(blk,1,body_len,fp) != body_len) break;
        uint8_t trail[4]; fread(trail,1,4,fp);  /* trailing block len */

        if (btype == PCAPNG_IDB_TYPE && body_len >= 2) {
            link_type = (int)(swap ? (blk[0]<<8)|blk[1] : blk[0]|(blk[1]<<8));

        } else if (btype == PCAPNG_EPB_TYPE && body_len >= 20) {
            uint32_t ts_hi = swap ? u32be(blk+4)  : u32le(blk+4);
            uint32_t ts_lo = swap ? u32be(blk+8)  : u32le(blk+8);
            uint32_t cap_l = swap ? u32be(blk+12) : u32le(blk+12);

            if (cap_l > body_len - 20) cap_l = body_len - 20;
            uint64_t ts64 = ((uint64_t)ts_hi << 32) | ts_lo;
            double ts = (double)ts64 / 1000000.0;  /* microseconds */
            total_pkts++;

            const uint8_t *frame = blk+20;
            int flen = (int)cap_l;
            int sig  = -999;

            if (link_type == LINKTYPE_IEEE802_11_RADIOTAP) {
                int rt_end = 0;
                sig = parse_radiotap(frame, flen, &rt_end);
                frame += rt_end; flen -= rt_end;
            } else if (link_type != LINKTYPE_IEEE802_11) {
                continue;
            }
            if (flen >= 2) parse_dot11(frame, flen, ts, sig);
        }
        /* SHB and other blocks: skip */
    }
    free(blk);
}

/* ── main ─────────────────────────────────────────────────────── */
int main(int argc, char *argv[]) {
    if (argc < 2) {
        fprintf(stderr, "Usage: %s <pcap_file>\n", argv[0]);
        return 1;
    }
    FILE *fp = fopen(argv[1], "rb");
    if (!fp) {
        fprintf(stderr, "Cannot open: %s\n", argv[1]);
        return 1;
    }

    uint8_t magic[4];
    if (fread(magic,1,4,fp) != 4) { fclose(fp); return 1; }

    uint32_t mle = u32le(magic);

    printf("{\"frames\":[\n");

    if (mle == PCAP_MAGIC_LE || mle == PCAP_MAGIC_NS_LE ||
        mle == PCAP_MAGIC_BE || mle == PCAP_MAGIC_NS_BE) {
        read_pcap(fp, mle);
    } else if (mle == PCAPNG_SHB_TYPE) {
        read_pcapng(fp);
    } else {
        fprintf(stderr, "Unknown format (magic: %08x)\n", mle);
        fclose(fp); return 1;
    }

    printf("\n],\"total\":%llu}\n", (unsigned long long)total_pkts);
    fclose(fp);
    return 0;
}
