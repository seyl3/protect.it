// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./IERC20.sol";
import "./IOracle.sol";
import "./PredictionToken.sol";

contract PredictionMarket {
    IERC20 public immutable usdc;
    IOracle public immutable oracle;
    PredictionToken public immutable yesToken;
    PredictionToken public immutable noToken;
    
    string public question;
    string public protocolName;
    string public category;
    uint256 public endTime;
    uint256 public constant INITIAL_TOKENS = 1000000 * 1e18;
    uint256 public constant PRECISION = 1e18;
    uint256 public constant MIN_TRADE_AMOUNT = 1 * 1e6; // 1 USDC minimum
    
    uint256 public yesTokens;
    uint256 public noTokens;
    uint256 public k;
    uint256 public totalUsdcDeposited;
    
    mapping(address => bool) public hasClaimed;
    
    bool public resolved;
    bool public yesWon;
    bool public frozen;
    
    event TokensPurchased(address indexed user, bool isYes, uint256 usdcAmount, uint256 tokensReceived);
    event MarketResolved(bool yesWon);
    event WinningsClaimed(address indexed user, uint256 amount);
    event MarketFrozen();
    event MarketUnfrozen();
    
    modifier onlyOracle() {
        require(oracle.canResolve(address(this)) && msg.sender == address(oracle), "Only oracle");
        _;
    }
    
    modifier marketActive() {
        require(!resolved && !frozen && block.timestamp < endTime, "Market inactive");
        _;
    }
    
    modifier marketResolved() {
        require(resolved, "Market not resolved");
        _;
    }
    
    constructor(
        address _usdc,
        IOracle _oracle,
        address _yesToken,
        address _noToken,
        string memory _question,
        string memory _protocolName,
        string memory _category,
        uint256 _durationInDays
    ) {
        usdc = IERC20(_usdc);
        oracle = _oracle;
        yesToken = PredictionToken(_yesToken);
        noToken = PredictionToken(_noToken);
        question = _question;
        protocolName = _protocolName;
        category = _category;
        endTime = block.timestamp + (_durationInDays * 1 days);
        
        yesTokens = INITIAL_TOKENS;
        noTokens = INITIAL_TOKENS;
        k = yesTokens * noTokens;
    }
    
    function buyYes(uint256 usdcAmount) external marketActive {
        require(usdcAmount >= MIN_TRADE_AMOUNT, "Below minimum trade amount");
        require(usdc.transferFrom(msg.sender, address(this), usdcAmount), "Transfer failed");
        
        uint256 tokensOut = getYesTokensOut(usdcAmount);
        require(tokensOut > 0, "No tokens out");
        
        yesTokens -= tokensOut;
        noTokens += usdcAmount;
        
        yesToken.mint(msg.sender, tokensOut);
        totalUsdcDeposited += usdcAmount;
        
        emit TokensPurchased(msg.sender, true, usdcAmount, tokensOut);
    }
    
    function buyYesWithSlippage(uint256 usdcAmount, uint256 minTokensOut) external marketActive {
        require(usdcAmount >= MIN_TRADE_AMOUNT, "Below minimum trade amount");
        require(usdc.transferFrom(msg.sender, address(this), usdcAmount), "Transfer failed");
        
        uint256 tokensOut = getYesTokensOut(usdcAmount);
        require(tokensOut >= minTokensOut, "Slippage too high");
        require(tokensOut > 0, "No tokens out");
        
        yesTokens -= tokensOut;
        noTokens += usdcAmount;
        
        yesToken.mint(msg.sender, tokensOut);
        totalUsdcDeposited += usdcAmount;
        
        emit TokensPurchased(msg.sender, true, usdcAmount, tokensOut);
    }
    
    function buyNo(uint256 usdcAmount) external marketActive {
        require(usdcAmount >= MIN_TRADE_AMOUNT, "Below minimum trade amount");
        require(usdc.transferFrom(msg.sender, address(this), usdcAmount), "Transfer failed");
        
        uint256 tokensOut = getNoTokensOut(usdcAmount);
        require(tokensOut > 0, "No tokens out");
        
        noTokens -= tokensOut;
        yesTokens += usdcAmount;
        
        noToken.mint(msg.sender, tokensOut);
        totalUsdcDeposited += usdcAmount;
        
        emit TokensPurchased(msg.sender, false, usdcAmount, tokensOut);
    }
    
    function buyNoWithSlippage(uint256 usdcAmount, uint256 minTokensOut) external marketActive {
        require(usdcAmount >= MIN_TRADE_AMOUNT, "Below minimum trade amount");
        require(usdc.transferFrom(msg.sender, address(this), usdcAmount), "Transfer failed");
        
        uint256 tokensOut = getNoTokensOut(usdcAmount);
        require(tokensOut >= minTokensOut, "Slippage too high");
        require(tokensOut > 0, "No tokens out");
        
        noTokens -= tokensOut;
        yesTokens += usdcAmount;
        
        noToken.mint(msg.sender, tokensOut);
        totalUsdcDeposited += usdcAmount;
        
        emit TokensPurchased(msg.sender, false, usdcAmount, tokensOut);
    }
    
    function getYesTokensOut(uint256 usdcIn) public view returns (uint256) {
        uint256 newNoTokens = noTokens + usdcIn;
        uint256 newYesTokens = k / newNoTokens;
        return yesTokens - newYesTokens;
    }
    
    function getNoTokensOut(uint256 usdcIn) public view returns (uint256) {
        uint256 newYesTokens = yesTokens + usdcIn;
        uint256 newNoTokens = k / newYesTokens;
        return noTokens - newNoTokens;
    }
    
    function getYesPrice() public view returns (uint256) {
        if (yesTokens == 0) return 0;
        return (noTokens * PRECISION) / yesTokens;
    }
    
    function getNoPrice() public view returns (uint256) {
        if (noTokens == 0) return 0;
        return (yesTokens * PRECISION) / noTokens;
    }
    
    function resolveMarket(bool _yesWon) external onlyOracle {
        require(!resolved, "Already resolved");
        require(block.timestamp >= endTime, "Market still active");
        
        resolved = true;
        yesWon = _yesWon;
        
        emit MarketResolved(_yesWon);
    }
    
    function freezeMarket() external onlyOracle {
        require(!frozen, "Already frozen");
        require(!resolved, "Market already resolved");
        
        frozen = true;
        emit MarketFrozen();
    }
    
    function unfreezeMarket() external onlyOracle {
        require(frozen, "Market not frozen");
        require(!resolved, "Market already resolved");
        
        frozen = false;
        emit MarketUnfrozen();
    }
    
    function claimWinnings() external marketResolved {
        require(!hasClaimed[msg.sender], "Already claimed");
        
        uint256 payout = calculatePayout(msg.sender);
        require(payout > 0, "No winnings");
        
        hasClaimed[msg.sender] = true;
        
        // Burn the winning tokens
        if (yesWon) {
            uint256 userYesBalance = yesToken.balanceOf(msg.sender);
            if (userYesBalance > 0) {
                yesToken.burn(msg.sender, userYesBalance);
            }
        } else {
            uint256 userNoBalance = noToken.balanceOf(msg.sender);
            if (userNoBalance > 0) {
                noToken.burn(msg.sender, userNoBalance);
            }
        }
        
        require(usdc.transfer(msg.sender, payout), "Transfer failed");
        
        emit WinningsClaimed(msg.sender, payout);
    }
    
    function calculatePayout(address user) public view marketResolved returns (uint256) {
        if (yesWon) {
            uint256 userYesBalance = yesToken.balanceOf(user);
            if (userYesBalance == 0) return 0;
            uint256 totalYesSupply = yesToken.totalSupply();
            if (totalYesSupply == 0) return 0;
            return (userYesBalance * totalUsdcDeposited) / totalYesSupply;
        } else {
            uint256 userNoBalance = noToken.balanceOf(user);
            if (userNoBalance == 0) return 0;
            uint256 totalNoSupply = noToken.totalSupply();
            if (totalNoSupply == 0) return 0;
            return (userNoBalance * totalUsdcDeposited) / totalNoSupply;
        }
    }
    
    function getUserPosition(address user) external view returns (uint256 yesBalance, uint256 noBalance) {
        return (yesToken.balanceOf(user), noToken.balanceOf(user));
    }
    
    function getMarketState() external view returns (
        uint256 _yesTokens,
        uint256 _noTokens,
        uint256 _yesPrice,
        uint256 _noPrice,
        uint256 _totalUsdcDeposited,
        bool _resolved,
        bool _yesWon,
        bool _frozen
    ) {
        return (
            yesTokens,
            noTokens,
            getYesPrice(),
            getNoPrice(),
            totalUsdcDeposited,
            resolved,
            yesWon,
            frozen
        );
    }
} 