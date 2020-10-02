const { expectRevert, time } = require('@openzeppelin/test-helpers');
const PlutusToken = artifacts.require('PlutusToken');
const Master = artifacts.require('Master');
const MockERC20 = artifacts.require('MockERC20');

contract('Master', ([alice, bob, carol, dev, minter]) => {
    beforeEach(async () => {
        this.plutus = await PlutusToken.new('0xb20569782E6471a847Fbd980FbA7ac5Ce6fa1759', { from: alice });
    });

    it('should set correct state variables', async () => {
        this.chef = await Master.new(this.plutus.address, dev, '1000', '0', '1000', { from: alice });
        await this.plutus.transferOwnership(this.chef.address, { from: alice });
        const plutus = await this.chef.plutus();
        const devaddr = await this.chef.devaddr();
        const owner = await this.plutus.owner();
        assert.equal(plutus.valueOf(), this.plutus.address);
        assert.equal(devaddr.valueOf(), dev);
        assert.equal(owner.valueOf(), this.chef.address);
    });

    it('should allow dev and only dev to update dev', async () => {
        this.chef = await Master.new(this.plutus.address, dev, '1000', '0', '1000', { from: alice });
        assert.equal((await this.chef.devaddr()).valueOf(), dev);
        await expectRevert(this.chef.dev(bob, { from: bob }), 'dev: wut?');
        await this.chef.dev(bob, { from: dev });
        assert.equal((await this.chef.devaddr()).valueOf(), bob);
        await this.chef.dev(alice, { from: bob });
        assert.equal((await this.chef.devaddr()).valueOf(), alice);
    })

    context('With ERC/LP token added to the field', () => {
        beforeEach(async () => {
            this.lp = await MockERC20.new('LPToken', 'LP', '10000000000', { from: minter });
            await this.lp.transfer(alice, '1000', { from: minter });
            await this.lp.transfer(bob, '1000', { from: minter });
            await this.lp.transfer(carol, '1000', { from: minter });
            this.lp2 = await MockERC20.new('LPToken2', 'LP2', '10000000000', { from: minter });
            await this.lp2.transfer(alice, '1000', { from: minter });
            await this.lp2.transfer(bob, '1000', { from: minter });
            await this.lp2.transfer(carol, '1000', { from: minter });
        });

        it('should allow emergency withdraw', async () => {
            // 100 per block farming rate starting at block 100 with bonus until block 1000
            this.chef = await Master.new(this.plutus.address, dev, '100', '100', '1000', { from: alice });
            await this.chef.add('100', this.lp.address, true);
            await this.lp.approve(this.chef.address, '1000', { from: bob });
            await this.chef.deposit(0, '100', { from: bob });
            assert.equal((await this.lp.balanceOf(bob)).valueOf(), '900');
            await this.chef.emergencyWithdraw(0, { from: bob });
            assert.equal((await this.lp.balanceOf(bob)).valueOf(), '1000');
        });
    });
});
