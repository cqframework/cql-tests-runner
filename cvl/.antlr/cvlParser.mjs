// Generated from C:/Users/Bryn/Documents/Src/SS/CQL/Src/grammar\cvl.g4 by ANTLR 4.12.0
// jshint ignore: start
import antlr4 from 'antlr4';
import cvlListener from './cvlListener.mjs';
import cvlVisitor from './cvlVisitor.mjs';

const serializedATN = [4,1,42,130,2,0,7,0,2,1,7,1,2,2,7,2,2,3,7,3,2,4,7,
4,2,5,7,5,2,6,7,6,2,7,7,7,2,8,7,8,2,9,7,9,2,10,7,10,2,11,7,11,2,12,7,12,
2,13,7,13,1,0,1,0,1,0,1,0,1,0,3,0,34,8,0,1,1,1,1,1,1,1,1,1,2,1,2,1,2,1,2,
1,2,1,2,1,2,1,2,1,2,1,2,3,2,50,8,2,1,3,1,3,1,3,1,3,1,3,1,3,1,3,1,4,3,4,60,
8,4,1,4,1,4,1,4,1,4,1,4,5,4,67,8,4,10,4,12,4,70,9,4,3,4,72,8,4,1,4,1,4,1,
5,1,5,1,5,1,5,1,6,1,6,1,6,1,6,1,6,1,6,5,6,86,8,6,10,6,12,6,89,9,6,3,6,91,
8,6,1,6,1,6,1,7,1,7,1,7,1,7,1,8,3,8,100,8,8,1,8,1,8,1,8,1,8,5,8,106,8,8,
10,8,12,8,109,9,8,3,8,111,8,8,1,8,1,8,1,9,1,9,1,10,1,10,3,10,119,8,10,1,
11,1,11,1,11,3,11,124,8,11,1,12,1,12,1,13,1,13,1,13,0,0,14,0,2,4,6,8,10,
12,14,16,18,20,22,24,26,0,6,1,0,2,3,1,0,6,7,1,0,9,10,1,0,34,36,1,0,15,22,
1,0,23,30,139,0,33,1,0,0,0,2,35,1,0,0,0,4,49,1,0,0,0,6,51,1,0,0,0,8,59,1,
0,0,0,10,75,1,0,0,0,12,79,1,0,0,0,14,94,1,0,0,0,16,99,1,0,0,0,18,114,1,0,
0,0,20,116,1,0,0,0,22,123,1,0,0,0,24,125,1,0,0,0,26,127,1,0,0,0,28,34,3,
4,2,0,29,34,3,6,3,0,30,34,3,8,4,0,31,34,3,12,6,0,32,34,3,16,8,0,33,28,1,
0,0,0,33,29,1,0,0,0,33,30,1,0,0,0,33,31,1,0,0,0,33,32,1,0,0,0,34,1,1,0,0,
0,35,36,3,20,10,0,36,37,5,1,0,0,37,38,3,20,10,0,38,3,1,0,0,0,39,50,7,0,0,
0,40,50,5,4,0,0,41,50,5,37,0,0,42,50,5,38,0,0,43,50,5,39,0,0,44,50,5,32,
0,0,45,50,5,31,0,0,46,50,5,33,0,0,47,50,3,20,10,0,48,50,3,2,1,0,49,39,1,
0,0,0,49,40,1,0,0,0,49,41,1,0,0,0,49,42,1,0,0,0,49,43,1,0,0,0,49,44,1,0,
0,0,49,45,1,0,0,0,49,46,1,0,0,0,49,47,1,0,0,0,49,48,1,0,0,0,50,5,1,0,0,0,
51,52,5,5,0,0,52,53,7,1,0,0,53,54,3,4,2,0,54,55,5,8,0,0,55,56,3,4,2,0,56,
57,7,2,0,0,57,7,1,0,0,0,58,60,5,11,0,0,59,58,1,0,0,0,59,60,1,0,0,0,60,61,
1,0,0,0,61,71,5,12,0,0,62,72,5,1,0,0,63,68,3,10,5,0,64,65,5,8,0,0,65,67,
3,10,5,0,66,64,1,0,0,0,67,70,1,0,0,0,68,66,1,0,0,0,68,69,1,0,0,0,69,72,1,
0,0,0,70,68,1,0,0,0,71,62,1,0,0,0,71,63,1,0,0,0,72,73,1,0,0,0,73,74,5,13,
0,0,74,9,1,0,0,0,75,76,3,18,9,0,76,77,5,1,0,0,77,78,3,0,0,0,78,11,1,0,0,
0,79,80,3,18,9,0,80,90,5,12,0,0,81,91,5,1,0,0,82,87,3,14,7,0,83,84,5,8,0,
0,84,86,3,14,7,0,85,83,1,0,0,0,86,89,1,0,0,0,87,85,1,0,0,0,87,88,1,0,0,0,
88,91,1,0,0,0,89,87,1,0,0,0,90,81,1,0,0,0,90,82,1,0,0,0,91,92,1,0,0,0,92,
93,5,13,0,0,93,13,1,0,0,0,94,95,3,18,9,0,95,96,5,1,0,0,96,97,3,0,0,0,97,
15,1,0,0,0,98,100,5,14,0,0,99,98,1,0,0,0,99,100,1,0,0,0,100,101,1,0,0,0,
101,110,5,12,0,0,102,107,3,0,0,0,103,104,5,8,0,0,104,106,3,0,0,0,105,103,
1,0,0,0,106,109,1,0,0,0,107,105,1,0,0,0,107,108,1,0,0,0,108,111,1,0,0,0,
109,107,1,0,0,0,110,102,1,0,0,0,110,111,1,0,0,0,111,112,1,0,0,0,112,113,
5,13,0,0,113,17,1,0,0,0,114,115,7,3,0,0,115,19,1,0,0,0,116,118,5,38,0,0,
117,119,3,22,11,0,118,117,1,0,0,0,118,119,1,0,0,0,119,21,1,0,0,0,120,124,
3,24,12,0,121,124,3,26,13,0,122,124,5,37,0,0,123,120,1,0,0,0,123,121,1,0,
0,0,123,122,1,0,0,0,124,23,1,0,0,0,125,126,7,4,0,0,126,25,1,0,0,0,127,128,
7,5,0,0,128,27,1,0,0,0,12,33,49,59,68,71,87,90,99,107,110,118,123];


const atn = new antlr4.atn.ATNDeserializer().deserialize(serializedATN);

const decisionsToDFA = atn.decisionToState.map( (ds, index) => new antlr4.dfa.DFA(ds, index) );

const sharedContextCache = new antlr4.atn.PredictionContextCache();

export default class cvlParser extends antlr4.Parser {

    static grammarFileName = "cvl.g4";
    static literalNames = [ null, "':'", "'true'", "'false'", "'null'", 
                            "'Interval'", "'['", "'('", "','", "']'", "')'", 
                            "'Tuple'", "'{'", "'}'", "'List'", "'year'", 
                            "'month'", "'week'", "'day'", "'hour'", "'minute'", 
                            "'second'", "'millisecond'", "'years'", "'months'", 
                            "'weeks'", "'days'", "'hours'", "'minutes'", 
                            "'seconds'", "'milliseconds'" ];
    static symbolicNames = [ null, null, null, null, null, null, null, null, 
                             null, null, null, null, null, null, null, null, 
                             null, null, null, null, null, null, null, null, 
                             null, null, null, null, null, null, null, "DATE", 
                             "DATETIME", "TIME", "IDENTIFIER", "DELIMITEDIDENTIFIER", 
                             "QUOTEDIDENTIFIER", "STRING", "NUMBER", "LONGNUMBER", 
                             "WS", "COMMENT", "LINE_COMMENT" ];
    static ruleNames = [ "term", "ratio", "literal", "intervalSelector", 
                         "tupleSelector", "tupleElementSelector", "instanceSelector", 
                         "instanceElementSelector", "listSelector", "identifier", 
                         "quantity", "unit", "dateTimePrecision", "pluralDateTimePrecision" ];

    constructor(input) {
        super(input);
        this._interp = new antlr4.atn.ParserATNSimulator(this, atn, decisionsToDFA, sharedContextCache);
        this.ruleNames = cvlParser.ruleNames;
        this.literalNames = cvlParser.literalNames;
        this.symbolicNames = cvlParser.symbolicNames;
    }



	term() {
	    let localctx = new TermContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 0, cvlParser.RULE_term);
	    try {
	        this.state = 33;
	        this._errHandler.sync(this);
	        var la_ = this._interp.adaptivePredict(this._input,0,this._ctx);
	        switch(la_) {
	        case 1:
	            localctx = new LiteralTermContext(this, localctx);
	            this.enterOuterAlt(localctx, 1);
	            this.state = 28;
	            this.literal();
	            break;

	        case 2:
	            localctx = new IntervalSelectorTermContext(this, localctx);
	            this.enterOuterAlt(localctx, 2);
	            this.state = 29;
	            this.intervalSelector();
	            break;

	        case 3:
	            localctx = new TupleSelectorTermContext(this, localctx);
	            this.enterOuterAlt(localctx, 3);
	            this.state = 30;
	            this.tupleSelector();
	            break;

	        case 4:
	            localctx = new InstanceSelectorTermContext(this, localctx);
	            this.enterOuterAlt(localctx, 4);
	            this.state = 31;
	            this.instanceSelector();
	            break;

	        case 5:
	            localctx = new ListSelectorTermContext(this, localctx);
	            this.enterOuterAlt(localctx, 5);
	            this.state = 32;
	            this.listSelector();
	            break;

	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	ratio() {
	    let localctx = new RatioContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 2, cvlParser.RULE_ratio);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 35;
	        this.quantity();
	        this.state = 36;
	        this.match(cvlParser.T__0);
	        this.state = 37;
	        this.quantity();
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	literal() {
	    let localctx = new LiteralContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 4, cvlParser.RULE_literal);
	    var _la = 0;
	    try {
	        this.state = 49;
	        this._errHandler.sync(this);
	        var la_ = this._interp.adaptivePredict(this._input,1,this._ctx);
	        switch(la_) {
	        case 1:
	            localctx = new BooleanLiteralContext(this, localctx);
	            this.enterOuterAlt(localctx, 1);
	            this.state = 39;
	            _la = this._input.LA(1);
	            if(!(_la===2 || _la===3)) {
	            this._errHandler.recoverInline(this);
	            }
	            else {
	            	this._errHandler.reportMatch(this);
	                this.consume();
	            }
	            break;

	        case 2:
	            localctx = new NullLiteralContext(this, localctx);
	            this.enterOuterAlt(localctx, 2);
	            this.state = 40;
	            this.match(cvlParser.T__3);
	            break;

	        case 3:
	            localctx = new StringLiteralContext(this, localctx);
	            this.enterOuterAlt(localctx, 3);
	            this.state = 41;
	            this.match(cvlParser.STRING);
	            break;

	        case 4:
	            localctx = new NumberLiteralContext(this, localctx);
	            this.enterOuterAlt(localctx, 4);
	            this.state = 42;
	            this.match(cvlParser.NUMBER);
	            break;

	        case 5:
	            localctx = new LongNumberLiteralContext(this, localctx);
	            this.enterOuterAlt(localctx, 5);
	            this.state = 43;
	            this.match(cvlParser.LONGNUMBER);
	            break;

	        case 6:
	            localctx = new DateTimeLiteralContext(this, localctx);
	            this.enterOuterAlt(localctx, 6);
	            this.state = 44;
	            this.match(cvlParser.DATETIME);
	            break;

	        case 7:
	            localctx = new DateLiteralContext(this, localctx);
	            this.enterOuterAlt(localctx, 7);
	            this.state = 45;
	            this.match(cvlParser.DATE);
	            break;

	        case 8:
	            localctx = new TimeLiteralContext(this, localctx);
	            this.enterOuterAlt(localctx, 8);
	            this.state = 46;
	            this.match(cvlParser.TIME);
	            break;

	        case 9:
	            localctx = new QuantityLiteralContext(this, localctx);
	            this.enterOuterAlt(localctx, 9);
	            this.state = 47;
	            this.quantity();
	            break;

	        case 10:
	            localctx = new RatioLiteralContext(this, localctx);
	            this.enterOuterAlt(localctx, 10);
	            this.state = 48;
	            this.ratio();
	            break;

	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	intervalSelector() {
	    let localctx = new IntervalSelectorContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 6, cvlParser.RULE_intervalSelector);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 51;
	        this.match(cvlParser.T__4);
	        this.state = 52;
	        _la = this._input.LA(1);
	        if(!(_la===6 || _la===7)) {
	        this._errHandler.recoverInline(this);
	        }
	        else {
	        	this._errHandler.reportMatch(this);
	            this.consume();
	        }
	        this.state = 53;
	        this.literal();
	        this.state = 54;
	        this.match(cvlParser.T__7);
	        this.state = 55;
	        this.literal();
	        this.state = 56;
	        _la = this._input.LA(1);
	        if(!(_la===9 || _la===10)) {
	        this._errHandler.recoverInline(this);
	        }
	        else {
	        	this._errHandler.reportMatch(this);
	            this.consume();
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	tupleSelector() {
	    let localctx = new TupleSelectorContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 8, cvlParser.RULE_tupleSelector);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 59;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        if(_la===11) {
	            this.state = 58;
	            this.match(cvlParser.T__10);
	        }

	        this.state = 61;
	        this.match(cvlParser.T__11);
	        this.state = 71;
	        this._errHandler.sync(this);
	        switch(this._input.LA(1)) {
	        case 1:
	            this.state = 62;
	            this.match(cvlParser.T__0);
	            break;
	        case 34:
	        case 35:
	        case 36:
	            this.state = 63;
	            this.tupleElementSelector();
	            this.state = 68;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	            while(_la===8) {
	                this.state = 64;
	                this.match(cvlParser.T__7);
	                this.state = 65;
	                this.tupleElementSelector();
	                this.state = 70;
	                this._errHandler.sync(this);
	                _la = this._input.LA(1);
	            }
	            break;
	        default:
	            throw new antlr4.error.NoViableAltException(this);
	        }
	        this.state = 73;
	        this.match(cvlParser.T__12);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	tupleElementSelector() {
	    let localctx = new TupleElementSelectorContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 10, cvlParser.RULE_tupleElementSelector);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 75;
	        this.identifier();
	        this.state = 76;
	        this.match(cvlParser.T__0);
	        this.state = 77;
	        this.term();
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	instanceSelector() {
	    let localctx = new InstanceSelectorContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 12, cvlParser.RULE_instanceSelector);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 79;
	        this.identifier();
	        this.state = 80;
	        this.match(cvlParser.T__11);
	        this.state = 90;
	        this._errHandler.sync(this);
	        switch(this._input.LA(1)) {
	        case 1:
	            this.state = 81;
	            this.match(cvlParser.T__0);
	            break;
	        case 34:
	        case 35:
	        case 36:
	            this.state = 82;
	            this.instanceElementSelector();
	            this.state = 87;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	            while(_la===8) {
	                this.state = 83;
	                this.match(cvlParser.T__7);
	                this.state = 84;
	                this.instanceElementSelector();
	                this.state = 89;
	                this._errHandler.sync(this);
	                _la = this._input.LA(1);
	            }
	            break;
	        default:
	            throw new antlr4.error.NoViableAltException(this);
	        }
	        this.state = 92;
	        this.match(cvlParser.T__12);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	instanceElementSelector() {
	    let localctx = new InstanceElementSelectorContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 14, cvlParser.RULE_instanceElementSelector);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 94;
	        this.identifier();
	        this.state = 95;
	        this.match(cvlParser.T__0);
	        this.state = 96;
	        this.term();
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	listSelector() {
	    let localctx = new ListSelectorContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 16, cvlParser.RULE_listSelector);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 99;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        if(_la===14) {
	            this.state = 98;
	            this.match(cvlParser.T__13);
	        }

	        this.state = 101;
	        this.match(cvlParser.T__11);
	        this.state = 110;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        if((((_la) & ~0x1f) === 0 && ((1 << _la) & 2147506236) !== 0) || ((((_la - 32)) & ~0x1f) === 0 && ((1 << (_la - 32)) & 255) !== 0)) {
	            this.state = 102;
	            this.term();
	            this.state = 107;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	            while(_la===8) {
	                this.state = 103;
	                this.match(cvlParser.T__7);
	                this.state = 104;
	                this.term();
	                this.state = 109;
	                this._errHandler.sync(this);
	                _la = this._input.LA(1);
	            }
	        }

	        this.state = 112;
	        this.match(cvlParser.T__12);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	identifier() {
	    let localctx = new IdentifierContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 18, cvlParser.RULE_identifier);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 114;
	        _la = this._input.LA(1);
	        if(!(((((_la - 34)) & ~0x1f) === 0 && ((1 << (_la - 34)) & 7) !== 0))) {
	        this._errHandler.recoverInline(this);
	        }
	        else {
	        	this._errHandler.reportMatch(this);
	            this.consume();
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	quantity() {
	    let localctx = new QuantityContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 20, cvlParser.RULE_quantity);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 116;
	        this.match(cvlParser.NUMBER);
	        this.state = 118;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        if(((((_la - 15)) & ~0x1f) === 0 && ((1 << (_la - 15)) & 4259839) !== 0)) {
	            this.state = 117;
	            this.unit();
	        }

	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	unit() {
	    let localctx = new UnitContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 22, cvlParser.RULE_unit);
	    try {
	        this.state = 123;
	        this._errHandler.sync(this);
	        switch(this._input.LA(1)) {
	        case 15:
	        case 16:
	        case 17:
	        case 18:
	        case 19:
	        case 20:
	        case 21:
	        case 22:
	            this.enterOuterAlt(localctx, 1);
	            this.state = 120;
	            this.dateTimePrecision();
	            break;
	        case 23:
	        case 24:
	        case 25:
	        case 26:
	        case 27:
	        case 28:
	        case 29:
	        case 30:
	            this.enterOuterAlt(localctx, 2);
	            this.state = 121;
	            this.pluralDateTimePrecision();
	            break;
	        case 37:
	            this.enterOuterAlt(localctx, 3);
	            this.state = 122;
	            this.match(cvlParser.STRING);
	            break;
	        default:
	            throw new antlr4.error.NoViableAltException(this);
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	dateTimePrecision() {
	    let localctx = new DateTimePrecisionContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 24, cvlParser.RULE_dateTimePrecision);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 125;
	        _la = this._input.LA(1);
	        if(!((((_la) & ~0x1f) === 0 && ((1 << _la) & 8355840) !== 0))) {
	        this._errHandler.recoverInline(this);
	        }
	        else {
	        	this._errHandler.reportMatch(this);
	            this.consume();
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	pluralDateTimePrecision() {
	    let localctx = new PluralDateTimePrecisionContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 26, cvlParser.RULE_pluralDateTimePrecision);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 127;
	        _la = this._input.LA(1);
	        if(!((((_la) & ~0x1f) === 0 && ((1 << _la) & 2139095040) !== 0))) {
	        this._errHandler.recoverInline(this);
	        }
	        else {
	        	this._errHandler.reportMatch(this);
	            this.consume();
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}


}

cvlParser.EOF = antlr4.Token.EOF;
cvlParser.T__0 = 1;
cvlParser.T__1 = 2;
cvlParser.T__2 = 3;
cvlParser.T__3 = 4;
cvlParser.T__4 = 5;
cvlParser.T__5 = 6;
cvlParser.T__6 = 7;
cvlParser.T__7 = 8;
cvlParser.T__8 = 9;
cvlParser.T__9 = 10;
cvlParser.T__10 = 11;
cvlParser.T__11 = 12;
cvlParser.T__12 = 13;
cvlParser.T__13 = 14;
cvlParser.T__14 = 15;
cvlParser.T__15 = 16;
cvlParser.T__16 = 17;
cvlParser.T__17 = 18;
cvlParser.T__18 = 19;
cvlParser.T__19 = 20;
cvlParser.T__20 = 21;
cvlParser.T__21 = 22;
cvlParser.T__22 = 23;
cvlParser.T__23 = 24;
cvlParser.T__24 = 25;
cvlParser.T__25 = 26;
cvlParser.T__26 = 27;
cvlParser.T__27 = 28;
cvlParser.T__28 = 29;
cvlParser.T__29 = 30;
cvlParser.DATE = 31;
cvlParser.DATETIME = 32;
cvlParser.TIME = 33;
cvlParser.IDENTIFIER = 34;
cvlParser.DELIMITEDIDENTIFIER = 35;
cvlParser.QUOTEDIDENTIFIER = 36;
cvlParser.STRING = 37;
cvlParser.NUMBER = 38;
cvlParser.LONGNUMBER = 39;
cvlParser.WS = 40;
cvlParser.COMMENT = 41;
cvlParser.LINE_COMMENT = 42;

cvlParser.RULE_term = 0;
cvlParser.RULE_ratio = 1;
cvlParser.RULE_literal = 2;
cvlParser.RULE_intervalSelector = 3;
cvlParser.RULE_tupleSelector = 4;
cvlParser.RULE_tupleElementSelector = 5;
cvlParser.RULE_instanceSelector = 6;
cvlParser.RULE_instanceElementSelector = 7;
cvlParser.RULE_listSelector = 8;
cvlParser.RULE_identifier = 9;
cvlParser.RULE_quantity = 10;
cvlParser.RULE_unit = 11;
cvlParser.RULE_dateTimePrecision = 12;
cvlParser.RULE_pluralDateTimePrecision = 13;

class TermContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = cvlParser.RULE_term;
    }


	 
		copyFrom(ctx) {
			super.copyFrom(ctx);
		}

}


class TupleSelectorTermContext extends TermContext {

    constructor(parser, ctx) {
        super(parser);
        super.copyFrom(ctx);
    }

	tupleSelector() {
	    return this.getTypedRuleContext(TupleSelectorContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.enterTupleSelectorTerm(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.exitTupleSelectorTerm(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof cvlVisitor ) {
	        return visitor.visitTupleSelectorTerm(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}

cvlParser.TupleSelectorTermContext = TupleSelectorTermContext;

class LiteralTermContext extends TermContext {

    constructor(parser, ctx) {
        super(parser);
        super.copyFrom(ctx);
    }

	literal() {
	    return this.getTypedRuleContext(LiteralContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.enterLiteralTerm(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.exitLiteralTerm(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof cvlVisitor ) {
	        return visitor.visitLiteralTerm(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}

cvlParser.LiteralTermContext = LiteralTermContext;

class InstanceSelectorTermContext extends TermContext {

    constructor(parser, ctx) {
        super(parser);
        super.copyFrom(ctx);
    }

	instanceSelector() {
	    return this.getTypedRuleContext(InstanceSelectorContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.enterInstanceSelectorTerm(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.exitInstanceSelectorTerm(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof cvlVisitor ) {
	        return visitor.visitInstanceSelectorTerm(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}

cvlParser.InstanceSelectorTermContext = InstanceSelectorTermContext;

class IntervalSelectorTermContext extends TermContext {

    constructor(parser, ctx) {
        super(parser);
        super.copyFrom(ctx);
    }

	intervalSelector() {
	    return this.getTypedRuleContext(IntervalSelectorContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.enterIntervalSelectorTerm(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.exitIntervalSelectorTerm(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof cvlVisitor ) {
	        return visitor.visitIntervalSelectorTerm(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}

cvlParser.IntervalSelectorTermContext = IntervalSelectorTermContext;

class ListSelectorTermContext extends TermContext {

    constructor(parser, ctx) {
        super(parser);
        super.copyFrom(ctx);
    }

	listSelector() {
	    return this.getTypedRuleContext(ListSelectorContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.enterListSelectorTerm(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.exitListSelectorTerm(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof cvlVisitor ) {
	        return visitor.visitListSelectorTerm(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}

cvlParser.ListSelectorTermContext = ListSelectorTermContext;

class RatioContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = cvlParser.RULE_ratio;
    }

	quantity = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(QuantityContext);
	    } else {
	        return this.getTypedRuleContext(QuantityContext,i);
	    }
	};

	enterRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.enterRatio(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.exitRatio(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof cvlVisitor ) {
	        return visitor.visitRatio(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class LiteralContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = cvlParser.RULE_literal;
    }


	 
		copyFrom(ctx) {
			super.copyFrom(ctx);
		}

}


class TimeLiteralContext extends LiteralContext {

    constructor(parser, ctx) {
        super(parser);
        super.copyFrom(ctx);
    }

	TIME() {
	    return this.getToken(cvlParser.TIME, 0);
	};

	enterRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.enterTimeLiteral(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.exitTimeLiteral(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof cvlVisitor ) {
	        return visitor.visitTimeLiteral(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}

cvlParser.TimeLiteralContext = TimeLiteralContext;

class NullLiteralContext extends LiteralContext {

    constructor(parser, ctx) {
        super(parser);
        super.copyFrom(ctx);
    }


	enterRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.enterNullLiteral(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.exitNullLiteral(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof cvlVisitor ) {
	        return visitor.visitNullLiteral(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}

cvlParser.NullLiteralContext = NullLiteralContext;

class RatioLiteralContext extends LiteralContext {

    constructor(parser, ctx) {
        super(parser);
        super.copyFrom(ctx);
    }

	ratio() {
	    return this.getTypedRuleContext(RatioContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.enterRatioLiteral(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.exitRatioLiteral(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof cvlVisitor ) {
	        return visitor.visitRatioLiteral(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}

cvlParser.RatioLiteralContext = RatioLiteralContext;

class DateTimeLiteralContext extends LiteralContext {

    constructor(parser, ctx) {
        super(parser);
        super.copyFrom(ctx);
    }

	DATETIME() {
	    return this.getToken(cvlParser.DATETIME, 0);
	};

	enterRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.enterDateTimeLiteral(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.exitDateTimeLiteral(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof cvlVisitor ) {
	        return visitor.visitDateTimeLiteral(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}

cvlParser.DateTimeLiteralContext = DateTimeLiteralContext;

class StringLiteralContext extends LiteralContext {

    constructor(parser, ctx) {
        super(parser);
        super.copyFrom(ctx);
    }

	STRING() {
	    return this.getToken(cvlParser.STRING, 0);
	};

	enterRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.enterStringLiteral(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.exitStringLiteral(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof cvlVisitor ) {
	        return visitor.visitStringLiteral(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}

cvlParser.StringLiteralContext = StringLiteralContext;

class DateLiteralContext extends LiteralContext {

    constructor(parser, ctx) {
        super(parser);
        super.copyFrom(ctx);
    }

	DATE() {
	    return this.getToken(cvlParser.DATE, 0);
	};

	enterRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.enterDateLiteral(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.exitDateLiteral(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof cvlVisitor ) {
	        return visitor.visitDateLiteral(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}

cvlParser.DateLiteralContext = DateLiteralContext;

class BooleanLiteralContext extends LiteralContext {

    constructor(parser, ctx) {
        super(parser);
        super.copyFrom(ctx);
    }


	enterRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.enterBooleanLiteral(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.exitBooleanLiteral(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof cvlVisitor ) {
	        return visitor.visitBooleanLiteral(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}

cvlParser.BooleanLiteralContext = BooleanLiteralContext;

class NumberLiteralContext extends LiteralContext {

    constructor(parser, ctx) {
        super(parser);
        super.copyFrom(ctx);
    }

	NUMBER() {
	    return this.getToken(cvlParser.NUMBER, 0);
	};

	enterRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.enterNumberLiteral(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.exitNumberLiteral(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof cvlVisitor ) {
	        return visitor.visitNumberLiteral(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}

cvlParser.NumberLiteralContext = NumberLiteralContext;

class LongNumberLiteralContext extends LiteralContext {

    constructor(parser, ctx) {
        super(parser);
        super.copyFrom(ctx);
    }

	LONGNUMBER() {
	    return this.getToken(cvlParser.LONGNUMBER, 0);
	};

	enterRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.enterLongNumberLiteral(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.exitLongNumberLiteral(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof cvlVisitor ) {
	        return visitor.visitLongNumberLiteral(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}

cvlParser.LongNumberLiteralContext = LongNumberLiteralContext;

class QuantityLiteralContext extends LiteralContext {

    constructor(parser, ctx) {
        super(parser);
        super.copyFrom(ctx);
    }

	quantity() {
	    return this.getTypedRuleContext(QuantityContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.enterQuantityLiteral(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.exitQuantityLiteral(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof cvlVisitor ) {
	        return visitor.visitQuantityLiteral(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}

cvlParser.QuantityLiteralContext = QuantityLiteralContext;

class IntervalSelectorContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = cvlParser.RULE_intervalSelector;
    }

	literal = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(LiteralContext);
	    } else {
	        return this.getTypedRuleContext(LiteralContext,i);
	    }
	};

	enterRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.enterIntervalSelector(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.exitIntervalSelector(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof cvlVisitor ) {
	        return visitor.visitIntervalSelector(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class TupleSelectorContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = cvlParser.RULE_tupleSelector;
    }

	tupleElementSelector = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(TupleElementSelectorContext);
	    } else {
	        return this.getTypedRuleContext(TupleElementSelectorContext,i);
	    }
	};

	enterRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.enterTupleSelector(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.exitTupleSelector(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof cvlVisitor ) {
	        return visitor.visitTupleSelector(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class TupleElementSelectorContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = cvlParser.RULE_tupleElementSelector;
    }

	identifier() {
	    return this.getTypedRuleContext(IdentifierContext,0);
	};

	term() {
	    return this.getTypedRuleContext(TermContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.enterTupleElementSelector(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.exitTupleElementSelector(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof cvlVisitor ) {
	        return visitor.visitTupleElementSelector(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class InstanceSelectorContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = cvlParser.RULE_instanceSelector;
    }

	identifier() {
	    return this.getTypedRuleContext(IdentifierContext,0);
	};

	instanceElementSelector = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(InstanceElementSelectorContext);
	    } else {
	        return this.getTypedRuleContext(InstanceElementSelectorContext,i);
	    }
	};

	enterRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.enterInstanceSelector(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.exitInstanceSelector(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof cvlVisitor ) {
	        return visitor.visitInstanceSelector(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class InstanceElementSelectorContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = cvlParser.RULE_instanceElementSelector;
    }

	identifier() {
	    return this.getTypedRuleContext(IdentifierContext,0);
	};

	term() {
	    return this.getTypedRuleContext(TermContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.enterInstanceElementSelector(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.exitInstanceElementSelector(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof cvlVisitor ) {
	        return visitor.visitInstanceElementSelector(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class ListSelectorContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = cvlParser.RULE_listSelector;
    }

	term = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(TermContext);
	    } else {
	        return this.getTypedRuleContext(TermContext,i);
	    }
	};

	enterRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.enterListSelector(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.exitListSelector(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof cvlVisitor ) {
	        return visitor.visitListSelector(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class IdentifierContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = cvlParser.RULE_identifier;
    }

	IDENTIFIER() {
	    return this.getToken(cvlParser.IDENTIFIER, 0);
	};

	DELIMITEDIDENTIFIER() {
	    return this.getToken(cvlParser.DELIMITEDIDENTIFIER, 0);
	};

	QUOTEDIDENTIFIER() {
	    return this.getToken(cvlParser.QUOTEDIDENTIFIER, 0);
	};

	enterRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.enterIdentifier(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.exitIdentifier(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof cvlVisitor ) {
	        return visitor.visitIdentifier(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class QuantityContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = cvlParser.RULE_quantity;
    }

	NUMBER() {
	    return this.getToken(cvlParser.NUMBER, 0);
	};

	unit() {
	    return this.getTypedRuleContext(UnitContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.enterQuantity(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.exitQuantity(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof cvlVisitor ) {
	        return visitor.visitQuantity(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class UnitContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = cvlParser.RULE_unit;
    }

	dateTimePrecision() {
	    return this.getTypedRuleContext(DateTimePrecisionContext,0);
	};

	pluralDateTimePrecision() {
	    return this.getTypedRuleContext(PluralDateTimePrecisionContext,0);
	};

	STRING() {
	    return this.getToken(cvlParser.STRING, 0);
	};

	enterRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.enterUnit(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.exitUnit(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof cvlVisitor ) {
	        return visitor.visitUnit(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class DateTimePrecisionContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = cvlParser.RULE_dateTimePrecision;
    }


	enterRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.enterDateTimePrecision(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.exitDateTimePrecision(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof cvlVisitor ) {
	        return visitor.visitDateTimePrecision(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class PluralDateTimePrecisionContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = cvlParser.RULE_pluralDateTimePrecision;
    }


	enterRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.enterPluralDateTimePrecision(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof cvlListener ) {
	        listener.exitPluralDateTimePrecision(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof cvlVisitor ) {
	        return visitor.visitPluralDateTimePrecision(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}




cvlParser.TermContext = TermContext; 
cvlParser.RatioContext = RatioContext; 
cvlParser.LiteralContext = LiteralContext; 
cvlParser.IntervalSelectorContext = IntervalSelectorContext; 
cvlParser.TupleSelectorContext = TupleSelectorContext; 
cvlParser.TupleElementSelectorContext = TupleElementSelectorContext; 
cvlParser.InstanceSelectorContext = InstanceSelectorContext; 
cvlParser.InstanceElementSelectorContext = InstanceElementSelectorContext; 
cvlParser.ListSelectorContext = ListSelectorContext; 
cvlParser.IdentifierContext = IdentifierContext; 
cvlParser.QuantityContext = QuantityContext; 
cvlParser.UnitContext = UnitContext; 
cvlParser.DateTimePrecisionContext = DateTimePrecisionContext; 
cvlParser.PluralDateTimePrecisionContext = PluralDateTimePrecisionContext; 
