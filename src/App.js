import React, { useState, useEffect} from 'react';
import axios from 'axios';
import './App.css';


function App() {
  const [triggerUpdate, setTriggerUpdate] = useState(false);
  const [addressRows, setaddressRows] = useState([]);
  const [newAddress, setNewAddress] = useState('');

  const [expandedAddressIndex, setExpandedAddressIndex] = useState(null);

  useEffect(() => {
    const fetchAllAddresses = async () => {
      const response = await axios.get('http://127.0.0.1:5000/addresses');
      if (response.status === 200) {
        console.log("response.data is", response.data)
        setaddressRows(response.data);
      } else {
        console.error('Unexpected status code:', response.status);
      }
    };
  
    fetchAllAddresses();
  }, [triggerUpdate]);


  const handleAddAddress = () => {
    if (!newAddress) return;

    axios.post('http://127.0.0.1:5000/addresses', {
      address: newAddress,
    })
    .then(response => {
      if (response.status === 201) {
        setTriggerUpdate(prev => !prev);
        setNewAddress('');
      } else {
        console.error('Unexpected status code:', response.status);
      }
    })
    .catch((error) => {
      console.error('Error:', error);
    });
  };

  const handleSyncAddress = (index) => {
    const addressToSync = addressRows[index].address;
  
    axios.post(`http://127.0.0.1:5000/addresses/${addressToSync}/sync`)
      .then(response => {
        if (response.status === 200) {
            setTriggerUpdate(prev => !prev);
        } else {
          console.error('Unexpected status code:', response.status);
        }
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  };

  const handleRemoveAddress = (index) => {
    const addressToRemove = addressRows[index].address;
  
    axios.delete(`http://127.0.0.1:5000/addresses/${addressToRemove}`)
      .then(response => {
        if (response.status === 200) {
          console.log(response.data);
          setTriggerUpdate(prev => !prev);
        } else {
          console.error('Unexpected status code:', response.status);
        }
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  };

  const handleToggleTransactions = (index) => {
    setExpandedAddressIndex(prevIndex => prevIndex === index ? null : index);
  };

  return (
    <div className="app">
      <div className="search">
        <input
          type="text"
          placeholder="Enter Bitcoin Address"
          value={newAddress}
          onChange={(e) => setNewAddress(e.target.value)}
        />
        <button onClick={handleAddAddress}>Add</button>
      </div>
      <div className="container">
        <AddressTable 
          addressRows={addressRows} 
          handleToggleTransactions={handleToggleTransactions} 
          handleSyncAddress={handleSyncAddress} 
          handleRemoveAddress={handleRemoveAddress} 
          expandedAddressIndex={expandedAddressIndex} 
        />
      </div>
    </div>
  );
}

function AddressTable({ addressRows, handleToggleTransactions, handleSyncAddress, handleRemoveAddress, expandedAddressIndex }) {
  return (
    <table>
    <thead>
      <tr>
        <th>Actions</th>
        <th>Address</th>
        <th>Balance</th>
        <th>Transactions</th>
      </tr>
    </thead>
    <tbody>
      {addressRows.map((addr, index) => (
        <React.Fragment key={index}>
          <tr onClick={() => handleToggleTransactions(index)}>
            <td>
              <button onClick={(e) => { e.stopPropagation(); handleSyncAddress(index); }}>Sync</button>
              <button onClick={(e) => { e.stopPropagation(); handleRemoveAddress(index); }}>Remove</button>
            </td>
            <td>{addr.address}</td>
            <td>{addr.balance}</td>
            <td>{expandedAddressIndex === index ? 'Hide' : 'Show'}</td>
          </tr>
          {expandedAddressIndex === index && (
            <tr>
              <td colSpan="4">
                <table>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Sent</th>
                      <th>Received</th>
                      <th>Fee</th>
                      <th>Value</th>
                      <th>Gains</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {addr.transactions.map((tx, idx) => (
                      <tr key={idx}>
                        <td>{tx.category}</td>
                        <td>{tx.sent}</td>
                        <td>{tx.received}</td>
                        <td>{tx.fee}</td>
                        <td>{tx.value}</td>
                        <td>{tx.gains}</td>
                        <td>{tx.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </td>
            </tr>
          )}
        </React.Fragment>
      ))}
    </tbody>
  </table>
  );
}

export default App;
