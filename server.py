import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import os
from dataclasses import dataclass, field

app = Flask(__name__)
CORS(app, origins=['http://localhost:3000'])

BLOCKCHAIN_API_URL = os.getenv('BLOCKCHAIN_API_URL', 'https://blockchain.info/rawaddr/')

# Dummy db to store Address objects
addresses = {}

@dataclass
class Transaction:
    category: str
    sent: int
    received: int
    fee: int
    value: int
    gains: int
    date: str

@dataclass
class Address:
    address: str
    balance: int = 0
    transactions: list = field(default_factory=list)

    def sync_transactions(self):
        num_transactions = 10  # Displaying only the last 10 transactions
        api_url = f"{BLOCKCHAIN_API_URL}{self.address}?limit={num_transactions}"

        response = requests.get(api_url)
        if response.status_code == 200:
            data = response.json()
            self.balance = data.get('final_balance', 0)
            transactions = data.get('txs', [])
            self.transactions = []

            for tx in transactions:
                sent = sum(out['value'] for out in tx['out'] if out['spent'] and out['addr'] != self.address)
                received = sum(out['value'] for out in tx.get('out', []) if 'spent' in out and 'addr' in out and not out['spent'] and out['addr'] == self.address)
                fee = tx.get('fee', 0)
                tx_date = datetime.datetime.fromtimestamp(tx['time']).strftime('%Y-%m-%d %H:%M:%S')

                self.transactions.append(Transaction(
                    category='Sent' if sent > received else 'Received',
                    sent=sent,
                    received=received,
                    fee=fee,
                    value=abs(received - sent),
                    gains=0,  # TODO: implement this logic
                    date=tx_date
                ))
            return True, 'Wallet synchronized successfully'
        else:
            return False, 'Failed to fetch data from blockchain API'

@app.route('/addresses', methods=['POST'])
def add_address():
    data = request.json
    address = data.get('address')
    if address:
        if address not in addresses:
            temp_address = Address(address)
            success, _ = temp_address.sync_transactions()
            if success:
                addresses[address] = temp_address
                return jsonify({'message': 'Address added and synchronized successfully'}), 201
            else:
                return jsonify({'error': 'Failed to synchronize address'}), 500
        else:
            return jsonify({'error': 'Address already exists'}), 400
    else:
        return jsonify({'error': 'Invalid or missing address'}), 400

@app.route('/addresses/<string:address>/sync', methods=['POST'])
def sync_wallet(address):
    if address in addresses:
        success, message = addresses[address].sync_transactions()
        return jsonify({'message': message}), 200 if success else 500
    else:
        return jsonify({'error': 'Address not found'}), 404

@app.route('/addresses', methods=['GET'])
def get_addresses():
    all_addresses = []
    for address in addresses.values():
        all_addresses.append({
            'address': address.address,
            'balance': address.balance,
            'transactions': [t.__dict__ for t in address.transactions]
        })
    return jsonify(all_addresses), 200

@app.route('/addresses/<string:address>', methods=['DELETE'])
def remove_address(address):
    if address in addresses:
        del addresses[address]
        return jsonify({'message': 'Address removed successfully'}), 200
    else:
        return jsonify({'error': 'Address not found'}), 404

if __name__ == '__main__':
    app.run(debug=True)
