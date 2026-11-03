import sys
from pathlib import Path

import torch
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)

ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT_DIR))

from src.models.resnet import create_model
from src.training.dataset import test_loader, test_dataset

DEVICE = torch.device(
    "mps" if torch.backends.mps.is_available() else "cpu"
)

CHECKPOINT_PATH = ROOT_DIR / "checkpoints" / "best_model.pth"


def evaluate():

    print("\n=== ZOO AI - EVALUATION ===")

    # Charger le modèle sauvegardé
    checkpoint = torch.load(
        CHECKPOINT_PATH,
        map_location="cpu",
        weights_only=True
    )

    # Vérifier la correspondance des espèces
    assert checkpoint["class_to_idx"] == test_dataset.class_to_idx, (
        "Les classes du modèle ne correspondent pas au dataset."
    )

    model = create_model(
        num_classes=checkpoint["num_classes"]
    )

    model.load_state_dict(checkpoint["model_state_dict"])

    model = model.to(DEVICE)

    # Mode évaluation
    model.eval()

    true_labels = []
    predictions = []

    # Pas de calcul de gradients
    with torch.inference_mode():

        for images, labels in test_loader:

            images = images.to(DEVICE)

            outputs = model(images)

            predicted = torch.argmax(outputs, dim=1)

            true_labels.extend(labels.tolist())
            predictions.extend(predicted.cpu().tolist())

    # Calcul des métriques
    accuracy = accuracy_score(true_labels, predictions)

    print(f"\nDevice : {DEVICE}")
    print(f"Images testées : {len(true_labels)}")
    print(f"Accuracy : {accuracy * 100:.2f}%")

    print("\n=== RAPPORT PAR ESPÈCE ===")

    print(
        classification_report(
            true_labels,
            predictions,
            labels=list(range(len(test_dataset.classes))),
            target_names=test_dataset.classes,
            zero_division=0
        )
    )

    print("\n=== MATRICE DE CONFUSION ===")

    print(
        confusion_matrix(
            true_labels,
            predictions,
            labels=list(range(len(test_dataset.classes)))
        )
    )


if __name__ == "__main__":
    evaluate()