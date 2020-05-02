/**
 * A tool for handling, executing, and building searches on Spotify
 */
module.exports = class SpotifySearch {
	/**
	 * @param {String} token Your Spotify authorization token. Required to have necessary scopes baked in to it.
	 */
	constructor(token) {
		/**
		 * The Spotify API token
		 */
		this.token = token;

		/**
		 * The query container
		 * @abstract
		 * @param {Object} query
		 */
		this.query = {
			limit: 1,
			type: "track"
		};
	}

	/**
	 * Define which type
	 * @param {String} type The result type to return
	 * @returns {SpotifySearch}
	 */
	type(string) {
		if (string===undefined) throw new Error("Missing string");
		if (!["album", "artist", "playlist", "track", "show","episode"].includes(string)) throw new Error(`Invalid type '${string}'`);
		this.query.type = string;
		return this;
	}

	/**
	 * Append a filter to the search
	 * @param {String} type The filter type
	 * @param {String} value The filter value
	 */
	filter(type, value) {
		if (type===undefined) throw new Error("Missing type");
		if (value===undefined) throw new Error("Missing value");
		if (!["year","genre","album", "artist", "playlist", "track", "show","episode"].includes(type)) throw new Error(`Invalid filter type '${type}'`)
		this.query.filters.push({type:type, value:value});
	}

	/**
	 * Limit the return results. Default: 1.
	 * @param {Number} value Max return results
	 * @returns {SpotifySearch}
	 */
	limit(number=1) {
		if (isNaN(number)||!Number.isInteger(parseInt(number))) throw new Error(`Invalid type for limit. Number is required, got ${typeof(number)}`);
		number=parseInt(number);
		if (number<=0) throw new Error(`Limit must be a positive integer of 1 or higher`)
		this.query.limit = number;
		return this;
	}

	/**
	 * Sets the country code to filter return results by.
	 * {@link https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2}
	 * @param {String} [countryCode]
	 * @returns {SpotifySearch}
	 */
	market(countryCode) {
		if(!countryCode) {
			countryCode = "US";
		} else {
			let cc = ["AA", "AB", "AC", "AD", "AE", "AF", "AG", "AH", "AI", "AJ", "AK", "AL", "AM", "AN", "AO", "AP", "AQ", "AR", "AS", "AT", "AU", "AV", "AW", "AX", "AY", "AZ", "BA", "BB", "BC", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BK", "BL", "BM", "BN", "BO", "BP", "BQ", "BR", "BS", "BT", "BU", "BV", "BW", "BX", "BY", "BZ", "CA", "CB", "CC", "CD", "CE", "CF", "CG", "CH", "CI", "CJ", "CK", "CL", "CM", "CN", "CO", "CP", "CQ", "CR", "CS", "CT", "CU", "CV", "CW", "CX", "CY", "CZ", "DA", "DB", "DC", "DD", "DE", "DF", "DG", "DH", "DI", "DJ", "DK", "DL", "DM", "DN", "DO", "DP", "DQ", "DR", "DS", "DT", "DU", "DV", "DW", "DX", "DY", "DZ", "EA", "EB", "EC", "ED", "EE", "EF", "EG", "EH", "EI", "EJ", "EK", "EL", "EM", "EN", "EO", "EP", "EQ", "ER", "ES", "ET", "EU", "EV", "EW", "EX", "EY", "EZ", "FA", "FB", "FC", "FD", "FE", "FF", "FG", "FH", "FI", "FJ", "FK", "FL", "FM", "FN", "FO", "FP", "FQ", "FR", "FS", "FT", "FU", "FV", "FW", "FX", "FY", "FZ", "GA", "GB", "GC", "GD", "GE", "GF", "GG", "GH", "GI", "GJ", "GK", "GL", "GM", "GN", "GO", "GP", "GQ", "GR", "GS", "GT", "GU", "GV", "GW", "GX", "GY", "GZ", "HA", "HB", "HC", "HD", "HE", "HF", "HG", "HH", "HI", "HJ", "HK", "HL", "HM", "HN", "HO", "HP", "HQ", "HR", "HS", "HT", "HU", "HV", "HW", "HX", "HY", "HZ", "IA", "IB", "IC", "ID", "IE", "IF", "IG", "IH", "II", "IJ", "IK", "IL", "IM", "IN", "IO", "IP", "IQ", "IR", "IS", "IT", "IU", "IV", "IW", "IX", "IY", "IZ", "JA", "JB", "JC", "JD", "JE", "JF", "JG", "JH", "JI", "JJ", "JK", "JL", "JM", "JN", "JO", "JP", "JQ", "JR", "JS", "JT", "JU", "JV", "JW", "JX", "JY", "JZ", "KA", "KB", "KC", "KD", "KE", "KF", "KG", "KH", "KI", "KJ", "KK", "KL", "KM", "KN", "KO", "KP", "KQ", "KR", "KS", "KT", "KU", "KV", "KW", "KX", "KY", "KZ", "LA", "LB", "LC", "LD", "LE", "LF", "LG", "LH", "LI", "LJ", "LK", "LL", "LM", "LN", "LO", "LP", "LQ", "LR", "LS", "LT", "LU", "LV", "LW", "LX", "LY", "LZ", "MA", "MB", "MC", "MD", "ME", "MF", "MG", "MH", "MI", "MJ", "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NB", "NC", "ND", "NE", "NF", "NG", "NH", "NI", "NJ", "NK", "NL", "NM", "NN", "NO", "NP", "NQ", "NR", "NS", "NT", "NU", "NV", "NW", "NX", "NY", "NZ", "OA", "OB", "OC", "OD", "OE", "OF", "OG", "OH", "OI", "OJ", "OK", "OL", "OM", "ON", "OO", "OP", "OQ", "OR", "OS", "OT", "OU", "OV", "OW", "OX", "OY", "OZ", "PA", "PB", "PC", "PD", "PE", "PF", "PG", "PH", "PI", "PJ", "PK", "PL", "PM", "PN", "PO", "PP", "PQ", "PR", "PS", "PT", "PU", "PV", "PW", "PX", "PY", "PZ", "QA", "QB", "QC", "QD", "QE", "QF", "QG", "QH", "QI", "QJ", "QK", "QL", "QM", "QN", "QO", "QP", "QQ", "QR", "QS", "QT", "QU", "QV", "QW", "QX", "QY", "QZ", "RA", "RB", "RC", "RD", "RE", "RF", "RG", "RH", "RI", "RJ", "RK", "RL", "RM", "RN", "RO", "RP", "RQ", "RR", "RS", "RT", "RU", "RV", "RW", "RX", "RY", "RZ", "SA", "SB", "SC", "SD", "SE", "SF", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SP", "SQ", "SR", "SS", "ST", "SU", "SV", "SW", "SX", "SY", "SZ", "TA", "TB", "TC", "TD", "TE", "TF", "TG", "TH", "TI", "TJ", "TK", "TL", "TM", "TN", "TO", "TP", "TQ", "TR", "TS", "TT", "TU", "TV", "TW", "TX", "TY", "TZ", "UA", "UB", "UC", "UD", "UE", "UF", "UG", "UH", "UI", "UJ", "UK", "UL", "UM", "UN", "UO", "UP", "UQ", "UR", "US", "UT", "UU", "UV", "UW", "UX", "UY", "UZ", "VA", "VB", "VC", "VD", "VE", "VF", "VG", "VH", "VI", "VJ", "VK", "VL", "VM", "VN", "VO", "VP", "VQ", "VR", "VS", "VT", "VU", "VV", "VW", "VX", "VY", "VZ", "WA", "WB", "WC", "WD", "WE", "WF", "WG", "WH", "WI", "WJ", "WK", "WL", "WM", "WN", "WO", "WP", "WQ", "WR", "WS", "WT", "WU", "WV", "WW", "WX", "WY", "WZ", "XA", "XB", "XC", "XD", "XE", "XF", "XG", "XH", "XI", "XJ", "XK", "XL", "XM", "XN", "XO", "XP", "XQ", "XR", "XS", "XT", "XU", "XV", "XW", "XX", "XY", "XZ", "YA", "YB", "YC", "YD", "YE", "YF", "YG", "YH", "YI", "YJ", "YK", "YL", "YM", "YN", "YO", "YP", "YQ", "YR", "YS", "YT", "YU", "YV", "YW", "YX", "YY", "YZ", "ZA", "ZB", "ZC", "ZD", "ZE", "ZF", "ZG", "ZH", "ZI", "ZJ", "ZK", "ZL", "ZM", "ZN", "ZO", "ZP", "ZQ", "ZR", "ZS", "ZT", "ZU", "ZV", "ZW", "ZX", "ZY", "ZZ"];
			if(!cc.includes(countryCode.toUpperCase())) throw new Error(`Invalid country code '${countryCode}'.`);
		}
		this.query.market = countryCode.toUpperCase();
		return this;
	}

	/**
	 * The search string to use
	 * @param {String|Array<String>} keywords The search string input
	 * @returns {SpotifySearch}
	 */
	search(keywords) {
		if (keywords===undefined) throw new Error("Missing keywords");
		if (Array.isArray(keywords)) {
			if (!keywords.every(e=>typeof(e)==="string")) throw new Error(`Search must be a string or array of strings`);
			keywords = keywords.join("%20");
		}
		this.query.q = keywords.replace(/\s+/g, "%20").replace(/['"`]/g,"").trim();
		return this;
	}

	/**
	 * Whether to enable external sources or not. Off by default.
	 * @param {Boolean} boolean Include or not. Default: false
	 * @returns {SpotifySearch}
	 */
	external(boolean) {
		// Boolean because there is only 1 value possible anyway.
		if (!!boolean) this.query.include_external = "audio";
		else delete this.query.include_external;
		return this; 
	}

	/**
	 * Offset search results, for pagination. Limit = 10, offset with offset of 2 will give you result number 11 to 21.
	 * @param {Number} number
	 * @returns {SpotifySearch}
	 */
	offset(number) {
		if (number===undefined) throw new Error("Missing number");
		if (isNaN(number)||!Number.isInteger(parseInt(number))) throw new Error(`Invalid type for offset. Number is required, got ${typeof(number)}`);
		number=parseInt(number);
		if (number<0) throw new Error(`Limit must be 0 or higher as integer`)
		this.query.offset = number;
		return this;
	}

	/**
	 * Whether the search query should be literally exact or match as tokens. 
	 * @param {Boolean} boolean Defaults to false, for looser search results.
	 * @returns {SpotifySearch}
	 */
	literal(boolean) {
		this._literal = !!boolean;
		return this;
	}

	/**
	 * A keyword or a list of keywords to exclude from search results.
	 * @param {String|Array<String>} keywords Any keyword(s) to NOT include in results
	 * @returns {SpotifySearch}
	 */
	not(keywords) {
		if (keywords===undefined) throw new Error("Missing keywords");
		if (Array.isArray(keywords)) {
			if (!keywords.every(e => typeof (e) === "string")) throw new Error(`Exclusion must be a string or array of strings`);
			keywords = keywords.join("%20");
		}
		this.query.not = keywords.trim();
		return this;
	}

	/**
	 * Builds the URL query parameter, which you add to the GET url.
	 * @returns {String}
	 */
	toString() {
		let string = String();
		
		// Append
		if (this.query.q) {
			if(this._literal) string += `"${this.query.q}"`;
			else string += `${this.query.q}`;
		}
		if (this.query.filters) this.query.filters.forEach(filter => {
			string += `%20${filter.type}:${filter.value}`;
		});
		if (this.query.not) string += `%20NOT%20${this.query.not}`;
		if (this.query.market) string += `&market=${this.query.market}`;
		if (this.query.offset) string += `&offset=${this.query.offset}`;
		string += `&limit=${this.query.limit}`;
		string += `&type=${this.query.type}`;

		// Trim
		if (string.startsWith("%20")) string = string.slice(3);
		if (string.startsWith("&")) string = string.slice(1);

		return `?${string}`;
	}

	/**
	 * Returns the full GET url to perform search based on current state
	 * @returns {String}
	 */
	get url() {
		return `https://https://api.spotify.com/v1/search${this.toString()}`;
	}
}