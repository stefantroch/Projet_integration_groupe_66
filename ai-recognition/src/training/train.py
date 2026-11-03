import sys
import random
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim

# Ajouter la racine du projet aux chemins Python
ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT_DIR))

from src.models.resnet import create_model
from src.training.dataset import (
    train_loader,
    val_loader,
    train_dataset,
)

# ==========================================
# CONFIGURATION
# ==========================================

EPOCHS = 10
LEARNING_RATE = 0.0001
SEED = 42

CHECKPOINT_DIR = ROOT_DIR / "checkpoints"
CHECKPOINT_PATH = CHECKPOINT_DIR / "best_model.pth"

DEVICE = torch.device(
    "mps" if torch.backends.mps.is_available() else "cpu"
)


# ==========================================
# REPRODUCTIBILITÉ
# ==========================================

def set_seed(seed):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


# ==========================================
# ENTRAÎNEMENT D'UNE ÉPOQUE
# ==========================================

def train_one_epoch(model, loader, criterion, optimizer):

    # On conserve le backbone en mode évaluation :
    # ses poids et statistiques BatchNorm restent fixes.
    model.eval()
    model.fc.train()

    running_loss = 0.0
    correct = 0
    total = 0

    for batch_idx, (images, labels) in enumerate(loader):

        images = images.to(DEVICE)
        labels = labels.to(DEVICE)

        # Réinitialiser les gradients
        optimizer.zero_grad()

        # Forward pass
        outputs = model(images)

        # Calcul de l'erreur
        loss = criterion(outputs, labels)

        # Backpropagation
        loss.backward()

        # Mise à jour des poids
        optimizer.step()

        # Statistiques
        running_loss += loss.item() * images.size(0)

        _, predicted = torch.max(outputs, 1)

        total += labels.size(0)
        correct += (predicted == labels).sum().item()

        if (batch_idx + 1) % 10 == 0:
            print(
                f"  Batch {batch_idx + 1}/{len(loader)}",
                flush=True
            )

    epoch_loss = running_loss / total
    epoch_accuracy = 100 * correct / total

    return epoch_loss, epoch_accuracy


# ==========================================
# VALIDATION
# ==========================================

def validate(model, loader, criterion):

    model.eval()

    running_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():

        for images, labels in loader:

            images = images.to(DEVICE)
            labels = labels.to(DEVICE)

            outputs = model(images)

            loss = criterion(outputs, labels)

            running_loss += loss.item() * images.size(0)

            _, predicted = torch.max(outputs, 1)

            total += labels.size(0)
            correct += (predicted == labels).sum().item()

    val_loss = running_loss / total
    val_accuracy = 100 * correct / total

    return val_loss, val_accuracy


# ==========================================
# ENTRAÎNEMENT PRINCIPAL
# ==========================================

def main():

    set_seed(SEED)

    CHECKPOINT_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    print("\n=================================")
    print("   ZOO AI - MODEL TRAINING")
    print("=================================\n")

    print(f"Device : {DEVICE}")
    print(f"Epochs : {EPOCHS}")
    print(f"Learning rate : {LEARNING_RATE}")

    print(f"\nImages train : {len(train_dataset)}")
    print(f"Classes : {train_dataset.classes}")

    # Créer le modèle
    model = create_model(
        num_classes=len(train_dataset.classes)
    )

    model = model.to(DEVICE)

    # Geler toutes les couches sauf la dernière
    for param in model.parameters():
        param.requires_grad = False

    for param in model.fc.parameters():
        param.requires_grad = True

    # Fonction de perte
    criterion = nn.CrossEntropyLoss()

    # Optimiseur : uniquement la dernière couche
    optimizer = optim.Adam(
        model.fc.parameters(),
        lr=LEARNING_RATE
    )

    best_accuracy = -1.0

    # ======================================
    # BOUCLE D'ENTRAÎNEMENT
    # ======================================

    for epoch in range(EPOCHS):

        print(f"\nEpoch {epoch + 1}/{EPOCHS}")
        print("---------------------------------")

        # Entraînement
        train_loss, train_acc = train_one_epoch(
            model,
            train_loader,
            criterion,
            optimizer
        )

        # Validation
        val_loss, val_acc = validate(
            model,
            val_loader,
            criterion
        )

        print(f"Train Loss     : {train_loss:.4f}")
        print(f"Train Accuracy : {train_acc:.2f}%")

        print(f"Val Loss       : {val_loss:.4f}")
        print(f"Val Accuracy   : {val_acc:.2f}%")

        # ==================================
        # SAUVEGARDE DU MEILLEUR MODÈLE
        # ==================================

        if val_acc > best_accuracy:

            best_accuracy = val_acc

            torch.save(
                {
                    "epoch": epoch + 1,
                    "model_state_dict": model.state_dict(),
                    "optimizer_state_dict": optimizer.state_dict(),
                    "accuracy": val_acc,
                    "class_to_idx": train_dataset.class_to_idx,
                    "num_classes": len(train_dataset.classes),
                    "learning_rate": LEARNING_RATE,
                },
                CHECKPOINT_PATH
            )

            print("Nouveau meilleur modèle sauvegardé !")

    print("\n=================================")
    print("       TRAINING COMPLETE")
    print("=================================")

    print(f"Best validation accuracy : {best_accuracy:.2f}%")
    print(f"Model saved : {CHECKPOINT_PATH}")


if __name__ == "__main__":
    main()